// Pure helpers for /partners/invoices — the on-demand partner invoice page.
//
// WHAT THIS PAGE REPLACES. Until now a month's invoice was produced by hand on
// a laptop: download two Airwallex exports, run a script, hand-fill ~25 fields
// into a JSON file, run two more scripts, screenshot the PDF to check it. It
// took hours and it produced real errors. zinc now gathers almost all of it
// (GET Invoice/inputs) and owns the arithmetic (POST Invoice/preview), so this
// page's whole job is: fetch the pieces, let the operator fill the handful zinc
// genuinely cannot know, and show the result before anything is committed.
//
// WHY THE ASSEMBLY LIVES HERE AND NOT IN THE COMPONENT. Everything below is a
// pure function over plain data, so the shaping that decides what a partner is
// paid is unit-tested rather than eyeballed in a browser. The .svelte file
// stays declarative. Same split as pnl.ts / pnl.test.ts.
//
// WHY THE TYPES ARE HAND-WRITTEN. The generated SDK (src/lib/api/core) is
// produced by `task sdk-gen` against a LIVE API, so the invoice endpoints
// cannot appear in it until zinc ships them. These mirror zinc's
// App/Modules/Invoices/API/V1/InvoiceModel.cs; when the SDK catches up they
// should be deleted in favour of the generated contracts.

// ---- wire types (mirror zinc InvoiceModel.cs) ----------------------------

export interface InvoiceInputTopupsRes {
  myr: number;
  sgd: number;
}

export interface InvoiceInputRouteRes {
  key: string;
  direction: number;
  tickets: number;
  revenue: number;
  terminated: { count: number; keptRevenue: number };
  priority: { paid: number; fee: number; free: number };
}

export interface InvoiceInputRowRes {
  month: string;
  grossDeposits: number;
  fees: { gateway: number; paymentMethod: number };
  refundFeesExcluded: number;
  routes: InvoiceInputRouteRes[];
  withdrawals: { count: number; total: number; income: number; withFee: number };
  topups: InvoiceInputTopupsRes;
}

export interface InvoicePartnerRes {
  suffix: string;
  name: string;
  roundingPreference: string;
}

export interface InvoiceTermsRes {
  marketingSharePct: number;
  infrastructure: number;
  recoveryPerBoost: number;
  recoveryPerTicket: number;
  partners: InvoicePartnerRes[];
}

export interface InvoiceSettingsRes {
  current: InvoiceTermsRes | null;
  upcoming: unknown[];
  upcomingPartners: unknown[];
}

export interface PreviewPriceLineReq {
  kind: 'policy' | 'discount';
  name: string;
  count: number;
  delta: number;
}

export interface PreviewInvoiceReq {
  period: { label: string; monthName: string; seq: string };
  issueDate: string;
  dueDate: string;
  topups: { date: string; rm: number; sgd: number }[];
  topupNote: string | null;
  fees: { gateway: number; paymentMethod: number };
  grossDeposits: number;
  refundFeesExcluded: number;
  routes: {
    key: string;
    label: string;
    short: string;
    tickets: number;
    revenue: number;
    fareRm: number;
    terminated: { count: number; keptRevenue: number; halfFareSgd: number };
  }[];
  withdrawals: { count: number; total: number };
  infrastructure: number;
  marketingSharePct: number;
  partners: { suffix: string; name: string; roundingPreference: string }[];
  priority: {
    perRoute: Record<string, { paid: number; fee: number; free: number }>;
    keptOnCancelled: number;
    keptOnCancelledCount: number;
  };
  surcharge: {
    coverage: { withBreakdown: number; total: number };
    perRoute: Record<string, PreviewPriceLineReq[]>;
  };
  withdrawalFee: { income: number; withFee: number; count: number };
  promotional: { count: number; amount: number };
  netTransfers: number;
  duplicates: { count: number; refunded: number };
  partnerRecovery: {
    freeBoosts: number;
    tickets: number;
    perBoost: number;
    perTicket: number;
  } | null;
  feeRateOverride: number | null;
  wastedFeeOverride: number | null;
}

export interface InvoiceShareRes {
  name: string;
  suffix: string;
  roundingPreference: string;
  pct: number;
  earned: number;
  advance: number;
  amount: number;
}

export interface InvoiceComputedRes {
  fx: {
    totalFundedRm: number;
    totalFundedSgd: number;
    fxRate: number;
    fxRatePrinted: number;
  };
  fee: { totalPaymentFees: number; feeRatePct: number };
  routes: unknown[];
  totals: {
    tickets: number;
    revenue: number;
    pricePerTicket: number;
    ticketFaresRm: number;
    ticketFaresSgd: number;
    processingFee: number;
    directCost: number;
    contribution: number;
    totalMarginPct: number;
  };
  adjustments: {
    terminatedNet: number;
    terminatedCount: number;
    wastedFee: number;
    wastedFeeComputed: number;
    infrastructure: number;
  };
  ancillary: {
    priority: { gross: number; feeCost: number; net: number; paid: number; free: number; kept: number; keptCount: number };
    surcharge: {
      gross: number;
      discounts: number;
      coverage: { withBreakdown: number; total: number };
      coveragePct: number;
    };
    withdrawalFee: { income: number; withFee: number; count: number };
    promotional: number;
    netTransfers: number;
    duplicates: { count: number; refunded: number };
    total: number;
  };
  recovery: {
    freeBoosts: number;
    tickets: number;
    perBoost: number;
    perTicket: number;
    boosts: number;
    ticketsAmount: number;
    total: number;
    applies: boolean;
  };
  result: {
    netProfit: number;
    netMarginPct: number;
    shareBase: number;
    marketingSharePool: number;
    shares: InvoiceShareRes[];
  };
}

export interface InvoiceSummaryRes {
  id: string;
  periodMonth: string;
  seq: string;
  status: string;
  ticketBasis: string;
  engineVersion: number;
  issueDate: string;
  dueDate: string;
  netProfit: number;
  poolTotal: number;
  createdAt: string;
  issuedAt: string | null;
}

export interface InvoiceDocumentRes extends Omit<InvoiceSummaryRes, 'netProfit' | 'poolTotal'> {
  inputs: PreviewInvoiceReq;
  computed: InvoiceComputedRes;
  createdBy: string | null;
  issuedBy: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
}

// ---- dates ---------------------------------------------------------------

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A calendar month, 1-indexed, as every function here takes it. */
export interface Month {
  year: number;
  month: number;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Days in a month, on the proleptic Gregorian calendar the invoice uses. */
export function daysInMonth({ year, month }: Month): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** zinc's month-precision wire format for GET Invoice/inputs: "MM-yyyy". */
export function monthParam(m: Month): string {
  return `${pad2(m.month)}-${m.year}`;
}

/**
 * zinc's date wire format, dd-MM-yyyy. ISO is rejected with a 400 — the same
 * trap documented on the P&L page.
 */
export function toApiDate(d: { year: number; month: number; day: number }): string {
  return `${pad2(d.day)}-${pad2(d.month)}-${d.year}`;
}

export function parseApiDate(s: string | null | undefined): { year: number; month: number; day: number } | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s ?? '');
  if (m == null) return null;
  return { year: Number(m[3]), month: Number(m[2]), day: Number(m[1]) };
}

/** First day of the invoiced month, as zinc's PeriodMonth wants it. */
export function periodMonthParam(m: Month): string {
  return toApiDate({ year: m.year, month: m.month, day: 1 });
}

/**
 * Default issue date: the 2nd of the following month. Matches how June, July
 * and August actually went out — the month has to close before it can be
 * invoiced, and the 1st is left for late-posting gateway fees to land.
 */
export function defaultIssueDate(m: Month): string {
  const year = m.month === 12 ? m.year + 1 : m.year;
  const month = m.month === 12 ? 1 : m.month + 1;
  return toApiDate({ year, month, day: 2 });
}

/** Default due date: 14 days after the issue date — the agreed net-14 terms. */
export function defaultDueDate(issueDate: string): string {
  const d = parseApiDate(issueDate);
  if (d == null) return issueDate;
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day));
  t.setUTCDate(t.getUTCDate() + 14);
  return toApiDate({ year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() });
}

/** "1–31 Aug 2026" — the period line the document prints. */
export function periodLabel(m: Month): string {
  return `1–${daysInMonth(m)} ${MONTH_SHORT[m.month - 1]} ${m.year}`;
}

/** "August 2026" */
export function monthName(m: Month): string {
  return `${MONTH_NAMES[m.month - 1]} ${m.year}`;
}

/**
 * The invoice reference number's middle segment: the invoiced month plus a
 * per-month running number. Every invoice issued so far is the first for its
 * month ("0601", "0701", "0801"); a re-issue would be "02".
 */
export function defaultSeq(m: Month, ordinal = 1): string {
  return `${pad2(m.month)}${pad2(ordinal)}`;
}

// ---- assembly ------------------------------------------------------------

const ROUTE_LABELS: Record<string, { label: string; short: string }> = {
  jbw: { label: 'JB → WOODLANDS', short: 'JB→W' },
  wjb: { label: 'WOODLANDS → JB', short: 'W→JB' },
};

/**
 * Translate GET Booking/ktmb-cost/current into the invoice's route keys.
 *
 * The two vocabularies disagree and always have: bookings speak
 * "JToW"/"WToJ", the invoice prints "jbw"/"wjb". Doing the mapping in one
 * named place is the difference between a missing fare (caught loudly by
 * blockingReasons) and the two routes' fares silently swapped — RM 5 against
 * RM 16.15, which would move the payable by thousands and still look like a
 * complete invoice.
 */
export function faresFromKtmbCost(current: Record<string, number> | null | undefined): Record<string, number> {
  const c = current ?? {};
  return {
    jbw: c['JToW'] ?? 0,
    wjb: c['WToJ'] ?? 0,
  };
}

/** Round to cents the way money is rounded everywhere on this page. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON * Math.sign(n)) * 100) / 100;
}

/**
 * The measured MYR→SGD rate: what the month's card top-ups actually cost,
 * SGD billed over MYR loaded. Zero when no top-up posted, which the caller
 * must treat as "not available" rather than as a rate — see topupsMissing.
 */
export function fxRate(t: InvoiceInputTopupsRes): number {
  if (t.myr <= 0) return 0;
  return t.sgd / t.myr;
}

/**
 * True when the month has no top-up data. Real for any month invoiced before
 * the Airwallex issuing sweep existed. Every ticket fare converts at this
 * rate, so a zero here would report the entire KTMB cost as nil and overstate
 * profit by the full cost of the tickets — the page must refuse to compute.
 */
export function topupsMissing(t: InvoiceInputTopupsRes): boolean {
  return t.myr <= 0 || t.sgd <= 0;
}

/**
 * The KTMB cost written off on terminated bookings: half a fare per
 * termination, converted at the month's measured rate.
 *
 * Half because a termination refunds the rider half of what they paid and
 * KTMB refunds us half the fare — the other half is gone. Rounded once, at
 * the end, matching the figures on the issued invoices to the cent.
 */
export function halfFareSgd(count: number, fareRm: number, rate: number): number {
  return round2((count * fareRm * rate) / 2);
}

/**
 * The figures zinc genuinely cannot gather, which the operator supplies.
 *
 * These are not laziness — each one is a fact that lives outside zinc's
 * records:
 *   surcharge lines   the named policy/discount breakdown as it should read on
 *                     the document; zinc knows the amounts per booking but not
 *                     what to call them
 *   priority kept     which boosted bookings were TERMINATED (fee kept)
 *                     rather than cancelled (fee returned)
 *   promotional       marketing credits issued from the admin console
 *   netTransfers      BunnyBooker↔wallet movements made by hand
 *   duplicates        double-charges spotted and refunded out-of-band
 *   recovery counts   what the partners sold outside the system
 */
export interface ManualInputs {
  surchargeLines: Record<string, PreviewPriceLineReq[]>;
  surchargeCoverage: { withBreakdown: number; total: number };
  priorityKept: { amount: number; count: number };
  promotional: { count: number; amount: number };
  netTransfers: number;
  duplicates: { count: number; refunded: number };
  recovery: { freeBoosts: number; tickets: number } | null;
}

/** Nothing entered: every manual figure zero, coverage matching the tickets. */
export function emptyManualInputs(inputs?: InvoiceInputRowRes | null): ManualInputs {
  const tickets = (inputs?.routes ?? []).reduce((a, r) => a + r.tickets, 0);
  return {
    surchargeLines: {},
    surchargeCoverage: { withBreakdown: tickets, total: tickets },
    priorityKept: { amount: 0, count: 0 },
    promotional: { count: 0, amount: 0 },
    netTransfers: 0,
    duplicates: { count: 0, refunded: 0 },
    recovery: null,
  };
}

export interface AssembleArgs {
  month: Month;
  inputs: InvoiceInputRowRes;
  terms: InvoiceTermsRes;
  /** current KTMB fare per direction in MYR, keyed by route ("jbw"/"wjb") */
  fares: Record<string, number>;
  manual: ManualInputs;
  issueDate: string;
  dueDate: string;
  seq: string;
}

/**
 * Build the exact payload POST Invoice/preview takes, from the gathered month,
 * the agreed terms, the current fares and the operator's manual figures.
 *
 * This is the whole of what used to be a hand-edited JSON file. It computes
 * nothing about the invoice: no profit, no split, no rounding of a payable.
 * The one derived figure is halfFareSgd, which is an INPUT to the engine
 * (the engine is not told the FX rate directly, it is told the top-ups) and
 * has to be expressed in SGD before it crosses the wire.
 */
export function assemblePreviewRequest(a: AssembleArgs): PreviewInvoiceReq {
  const rate = fxRate(a.inputs.topups);

  return {
    period: {
      label: periodLabel(a.month),
      monthName: monthName(a.month),
      seq: a.seq,
    },
    issueDate: a.issueDate,
    dueDate: a.dueDate,
    // One blended row rather than the itemized table the hand-built files
    // carried. The engine only ever uses the ratio of the totals; the
    // itemization was presentation, and zinc reports the month's pair.
    topups: [{ date: '', rm: a.inputs.topups.myr, sgd: a.inputs.topups.sgd }],
    topupNote: '',
    fees: {
      gateway: a.inputs.fees.gateway,
      paymentMethod: a.inputs.fees.paymentMethod,
    },
    grossDeposits: a.inputs.grossDeposits,
    refundFeesExcluded: a.inputs.refundFeesExcluded,
    routes: a.inputs.routes.map(r => {
      const fareRm = a.fares[r.key] ?? 0;
      return {
        key: r.key,
        label: ROUTE_LABELS[r.key]?.label ?? r.key.toUpperCase(),
        short: ROUTE_LABELS[r.key]?.short ?? r.key,
        tickets: r.tickets,
        revenue: r.revenue,
        fareRm,
        terminated: {
          count: r.terminated.count,
          keptRevenue: r.terminated.keptRevenue,
          halfFareSgd: halfFareSgd(r.terminated.count, fareRm, rate),
        },
      };
    }),
    withdrawals: { count: a.inputs.withdrawals.count, total: a.inputs.withdrawals.total },
    infrastructure: a.terms.infrastructure,
    marketingSharePct: a.terms.marketingSharePct,
    partners: a.terms.partners.map(p => ({
      suffix: p.suffix,
      name: p.name,
      roundingPreference: p.roundingPreference,
    })),
    priority: {
      perRoute: Object.fromEntries(
        a.inputs.routes.map(r => [r.key, { paid: r.priority.paid, fee: r.priority.fee, free: r.priority.free }]),
      ),
      keptOnCancelled: a.manual.priorityKept.amount,
      keptOnCancelledCount: a.manual.priorityKept.count,
    },
    surcharge: {
      coverage: a.manual.surchargeCoverage,
      perRoute: a.manual.surchargeLines,
    },
    withdrawalFee: {
      income: a.inputs.withdrawals.income,
      withFee: a.inputs.withdrawals.withFee,
      count: a.inputs.withdrawals.count,
    },
    promotional: a.manual.promotional,
    netTransfers: a.manual.netTransfers,
    duplicates: a.manual.duplicates,
    partnerRecovery:
      a.manual.recovery == null
        ? null
        : {
            freeBoosts: a.manual.recovery.freeBoosts,
            tickets: a.manual.recovery.tickets,
            perBoost: a.terms.recoveryPerBoost,
            perTicket: a.terms.recoveryPerTicket,
          },
    // Both overrides exist only to reproduce an already-issued document. A
    // month being generated now must never pin either: the whole point is
    // that the engine's own figures are what gets paid.
    feeRateOverride: null,
    wastedFeeOverride: null,
  };
}

// ---- blocking conditions -------------------------------------------------

/**
 * Reasons this month cannot be computed yet, as i18n keys. Returned rather
 * than thrown so the page can list every problem at once instead of making
 * the operator fix them one round trip at a time.
 *
 * Each of these would otherwise produce a complete, plausible-looking invoice
 * with a wrong payable — which is worse than an error, because nobody
 * re-reads a settled month.
 */
export function blockingReasons(
  inputs: InvoiceInputRowRes | null,
  terms: InvoiceTermsRes | null,
  fares: Record<string, number>,
): string[] {
  const reasons: string[] = [];
  if (inputs == null) return ['invoices.blocked.noInputs'];

  if (topupsMissing(inputs.topups)) reasons.push('invoices.blocked.noTopups');
  if (terms == null) reasons.push('invoices.blocked.noTerms');
  else if (terms.partners.length === 0) reasons.push('invoices.blocked.noPartners');

  // A fare of zero converts the entire KTMB cost to nil and reports the
  // month's whole ticket spend as profit.
  const missingFare = inputs.routes.some(r => r.tickets > 0 && (fares[r.key] ?? 0) <= 0);
  if (missingFare) reasons.push('invoices.blocked.noFare');

  if (inputs.routes.every(r => r.tickets === 0)) reasons.push('invoices.blocked.noTickets');

  return reasons;
}

/** Sum of what every partner is actually transferred. */
export function payableTotal(c: InvoiceComputedRes): number {
  return round2(c.result.shares.reduce((a, s) => a + s.amount, 0));
}

/**
 * The months offered in the picker, newest first.
 *
 * Walked backwards by hand rather than through Date arithmetic: constructing
 * `new Date(y, m - 1)` and decrementing would drag the host timezone into a
 * choice that is purely about SGT calendar months, and a browser west of
 * Singapore would be offered a different "last month" for part of each day.
 */
export function recentMonths(from: Month, count = 18): Month[] {
  const out: Month[] = [];
  let { year, month } = from;
  for (let i = 0; i < count; i++) {
    out.push({ year, month });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return out;
}

/**
 * The month an invoice would default to: the one before `today`.
 *
 * Never the current month. A month has to close before it can be invoiced —
 * its gateway fees post late, and its bookings are still moving.
 */
export function defaultMonth(today: Month): Month {
  return today.month === 1 ? { year: today.year - 1, month: 12 } : { year: today.year, month: today.month - 1 };
}

/** Badge styling for a stored invoice's status. */
export function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'issued') return 'default';
  if (status === 'void') return 'destructive';
  return 'secondary';
}

/** Newest month first — the list's only ordering. */
export function byMonthDescending(a: InvoiceSummaryRes, b: InvoiceSummaryRes): number {
  const pa = parseApiDate(a.periodMonth);
  const pb = parseApiDate(b.periodMonth);
  const ka = pa == null ? 0 : pa.year * 100 + pa.month;
  const kb = pb == null ? 0 : pb.year * 100 + pb.month;
  if (ka !== kb) return kb - ka;
  return b.seq.localeCompare(a.seq);
}
