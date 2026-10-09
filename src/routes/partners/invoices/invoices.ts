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
  /**
   * RM per ticket in force for THIS month (the fare effective at the month's
   * last SGT instant), not today's. null = no fare had been entered by then.
   * Optional so a zinc that predates the field reads as "missing", which
   * blocks, rather than as a crash.
   */
  ktmbFare?: number | null;
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

export interface InvoiceSettingsChangeRes {
  id: string;
  marketingSharePct: number;
  infrastructure: number;
  recoveryPerBoost: number;
  recoveryPerTicket: number;
  effectiveAt: string;
  createdAt: string;
}

export interface InvoicePartnerChangeRes {
  id: string;
  suffix: string;
  name: string;
  roundingPreference: string;
  active: boolean;
  position: number;
  effectiveAt: string;
  createdAt: string;
}

export interface InvoiceSettingsRes {
  current: InvoiceTermsRes | null;
  upcoming: InvoiceSettingsChangeRes[];
  upcomingPartners: InvoicePartnerChangeRes[];
}

/** POST Invoice/settings. Insert-only; effectiveAt null = immediate. */
export interface SetInvoiceSettingsReq {
  marketingSharePct: number;
  infrastructure: number;
  recoveryPerBoost: number;
  recoveryPerTicket: number;
  effectiveAt: string | null;
}

/** POST Invoice/settings/partners. Keyed by suffix; active = false retires. */
export interface SetInvoicePartnerReq {
  suffix: string;
  name: string;
  roundingPreference: string;
  active: boolean;
  position: number;
  effectiveAt: string | null;
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
    priority: {
      gross: number;
      feeCost: number;
      net: number;
      paid: number;
      free: number;
      kept: number;
      keptCount: number;
    };
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
 * The month's KTMB fare per route, keyed the way the invoice prints routes.
 *
 * Read from the gathered month itself (each route's ktmbFare), NOT from
 * GET Booking/ktmb-cost/current: that is the fare in force TODAY, and a
 * draft for June priced at October's fare is a wrong payable that looks
 * right. The issued invoices used RM 17.50 (Jun), 16.05 (Jul) and 16.15
 * (Aug) — one "current" fare can only ever match one of them.
 *
 * Keyed by the route's own key, so the two directions cannot be swapped
 * (RM 5 against RM 16.15 would move the payable by thousands). A route with
 * no fare reads 0, which blockingReasons refuses on.
 */
export function faresFromInputs(inputs: InvoiceInputRowRes | null | undefined): Record<string, number> {
  const out: Record<string, number> = { jbw: 0, wjb: 0 };
  for (const r of inputs?.routes ?? []) out[r.key] = r.ktmbFare ?? 0;
  return out;
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

/**
 * A manual field as a number. Blank, "-" mid-typing and any other non-numeric
 * text all become 0 rather than NaN: a NaN serialises to JSON `null`, which
 * the server would reject with a validation error naming a field the operator
 * cannot see, instead of simply treating an empty box as nothing entered.
 */
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
 *
 * Manual figures are coerced through num() on the way out. The shadcn Input
 * passes `type="number"` down via $$restProps, so Svelte cannot see it at
 * compile time and never applies its own numeric coercion — the bindings
 * arrive here as strings. Untouched, "1200" would reach a numeric field and
 * the server would reject the request, or worse, a "+" concatenation
 * somewhere downstream would silently produce a wrong figure.
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
      keptOnCancelled: num(a.manual.priorityKept.amount),
      keptOnCancelledCount: num(a.manual.priorityKept.count),
    },
    surcharge: {
      coverage: {
        withBreakdown: num(a.manual.surchargeCoverage.withBreakdown),
        total: num(a.manual.surchargeCoverage.total),
      },
      perRoute: a.manual.surchargeLines,
    },
    withdrawalFee: {
      income: a.inputs.withdrawals.income,
      withFee: a.inputs.withdrawals.withFee,
      count: a.inputs.withdrawals.count,
    },
    promotional: {
      count: num(a.manual.promotional.count),
      amount: num(a.manual.promotional.amount),
    },
    netTransfers: num(a.manual.netTransfers),
    duplicates: {
      count: num(a.manual.duplicates.count),
      refunded: num(a.manual.duplicates.refunded),
    },
    partnerRecovery:
      a.manual.recovery == null
        ? null
        : {
            freeBoosts: num(a.manual.recovery.freeBoosts),
            tickets: num(a.manual.recovery.tickets),
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

// ---- settings ------------------------------------------------------------
//
// The agreed terms the invoice is computed under. Both tables are empty on a
// fresh environment, and until they are filled blockingReasons() reports
// noTerms and the page cannot compute anything — so the form that fills them
// lives on the same page as the thing it unblocks.
//
// INSERT-ONLY. zinc never edits a terms row: every submit queues a new one,
// effective from EffectiveAt (blank = immediately). An invoice issued under
// the old terms stays explicable because the row it was computed under still
// exists. The form therefore never "edits" — it proposes the next row.

/**
 * The terms the issued June–August 2026 invoices were actually computed
 * under, read from invoices/data/2026-08.json (marketingSharePct,
 * infrastructure, partnerRecovery.perBoost/perTicket, partners[]). Offered
 * as the starting values on an environment that has none, so the owner
 * confirms the real agreement rather than retyping it from a PDF. Never
 * submitted on its own.
 */
export const SUGGESTED_TERMS = {
  marketingSharePct: 50,
  infrastructure: 500,
  recoveryPerBoost: 10,
  recoveryPerTicket: 3,
  partners: [
    { suffix: 'C', name: 'CLEON', roundingPreference: 'down', position: 0 },
    { suffix: 'Z', name: 'ZOEY', roundingPreference: 'up', position: 1 },
  ],
} as const;

export const ROUNDING_PREFERENCES = ['down', 'up'] as const;

/**
 * The settings form as the inputs bind it. Every numeric field is `unknown`
 * because the shadcn Input hands back strings (see assemblePreviewRequest).
 * effectiveDate is an SGT calendar day, dd-mm-yyyy, or blank for "now".
 */
export interface SettingsForm {
  marketingSharePct: unknown;
  infrastructure: unknown;
  recoveryPerBoost: unknown;
  recoveryPerTicket: unknown;
  effectiveDate: string;
}

export interface PartnerForm {
  suffix: string;
  name: string;
  roundingPreference: string;
  active: boolean;
  position: unknown;
  effectiveDate: string;
}

/**
 * Where the settings form starts: the terms in force when there are any (the
 * next row is usually a small change to them), otherwise SUGGESTED_TERMS.
 * `suggested` tells the page to say where the numbers came from.
 */
export function settingsFormFrom(current: InvoiceTermsRes | null): { form: SettingsForm; suggested: boolean } {
  const src = current ?? SUGGESTED_TERMS;
  return {
    form: {
      marketingSharePct: src.marketingSharePct,
      infrastructure: src.infrastructure,
      recoveryPerBoost: src.recoveryPerBoost,
      recoveryPerTicket: src.recoveryPerTicket,
      effectiveDate: '',
    },
    suggested: current == null,
  };
}

/**
 * Where the partner form starts: the first suggested partner not yet in
 * force, so an empty environment is two confirm-clicks from the real
 * agreement. Once both are in, a blank row positioned after the last one.
 */
export function partnerFormFrom(current: InvoiceTermsRes | null): { form: PartnerForm; suggested: boolean } {
  const have = new Set((current?.partners ?? []).map(p => p.suffix.toUpperCase()));
  const next = SUGGESTED_TERMS.partners.find(p => !have.has(p.suffix));
  if (next != null) {
    return {
      form: {
        suffix: next.suffix,
        name: next.name,
        roundingPreference: next.roundingPreference,
        active: true,
        position: next.position,
        effectiveDate: '',
      },
      suggested: true,
    };
  }
  return {
    form: {
      suffix: '',
      name: '',
      roundingPreference: 'down',
      active: true,
      position: current?.partners.length ?? 0,
      effectiveDate: '',
    },
    suggested: false,
  };
}

/** True when submitting this suffix changes an existing partner rather than adding one. */
export function partnerExists(current: InvoiceTermsRes | null, suffix: string): boolean {
  const s = suffix.trim().toUpperCase();
  return s !== '' && (current?.partners ?? []).some(p => p.suffix.toUpperCase() === s);
}

/** Present and numeric. Blank must not pass as zero here: a blank share would pay nobody. */
function isNumeric(v: unknown): boolean {
  return v != null && String(v).trim() !== '' && Number.isFinite(Number(v));
}

const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * An SGT calendar day as the UTC instant zinc stores EffectiveAt in: that
 * day's midnight in Singapore. Sent as ISO-8601 with a Z — zinc's EffectiveAt
 * is a DateTime, not one of the dd-MM-yyyy DateOnly strings, and a value
 * without a zone would bind as Unspecified and be read as UTC, i.e. 08:00 SGT.
 * Singapore has had no DST since 1982, so a fixed offset is exact.
 */
export function effectiveAtParam(date: string): string | null {
  const d = parseApiDate(date.trim());
  if (d == null) return null;
  return new Date(Date.UTC(d.year, d.month - 1, d.day) - SGT_OFFSET_MS).toISOString();
}

/** A dd-mm-yyyy string that names a real calendar day (31-02-2026 does not). */
function realApiDate(s: string): { year: number; month: number; day: number } | null {
  const d = parseApiDate(s);
  if (d == null || effectiveAtParam(s) == null) return null;
  const back = new Date(Date.UTC(d.year, d.month - 1, d.day));
  if (back.getUTCFullYear() !== d.year || back.getUTCMonth() + 1 !== d.month || back.getUTCDate() !== d.day)
    return null;
  return d;
}

/**
 * Validate the effective date: blank (now) or a future SGT day.
 *
 * Backdating is refused. zinc would accept it, but a backdated row silently
 * rewrites which terms were "in force" for a period that has already been
 * drafted under the old ones — exactly the history insert-only exists to
 * keep. Today is refused for the same reason (its midnight has passed);
 * blank is the way to say "from now".
 */
function effectiveDateErrors(date: string, today: { year: number; month: number; day: number }): string[] {
  const s = date.trim();
  if (s === '') return [];
  const d = realApiDate(s);
  if (d == null) return ['invoices.settings.errors.effectiveDate'];
  const key = (x: { year: number; month: number; day: number }) => x.year * 10000 + x.month * 100 + x.day;
  if (key(d) <= key(today)) return ['invoices.settings.errors.effectivePast'];
  return [];
}

/**
 * Everything wrong with the settings form, as i18n keys — all at once, like
 * blockingReasons. Mirrors zinc's SetInvoiceSettingsReqValidator so the owner
 * sees the reason before the round trip, plus the blank-is-not-zero rule zinc
 * cannot apply (it never sees the blank).
 */
export function settingsErrors(f: SettingsForm, today: { year: number; month: number; day: number }): string[] {
  const errors: string[] = [];
  if (!isNumeric(f.marketingSharePct) || num(f.marketingSharePct) < 0 || num(f.marketingSharePct) > 100)
    errors.push('invoices.settings.errors.share');
  if (!isNumeric(f.infrastructure) || num(f.infrastructure) < 0) errors.push('invoices.settings.errors.infrastructure');
  if (!isNumeric(f.recoveryPerBoost) || num(f.recoveryPerBoost) < 0)
    errors.push('invoices.settings.errors.recoveryPerBoost');
  if (!isNumeric(f.recoveryPerTicket) || num(f.recoveryPerTicket) < 0)
    errors.push('invoices.settings.errors.recoveryPerTicket');
  errors.push(...effectiveDateErrors(f.effectiveDate, today));
  return errors;
}

/** Mirrors SetInvoicePartnerReqValidator, plus a whole-number position (zinc's is an int). */
export function partnerErrors(f: PartnerForm, today: { year: number; month: number; day: number }): string[] {
  const errors: string[] = [];
  const suffix = f.suffix.trim();
  if (suffix === '' || suffix.length > 8) errors.push('invoices.settings.errors.suffix');
  const name = f.name.trim();
  if (name === '' || name.length > 128) errors.push('invoices.settings.errors.name');
  if (!(ROUNDING_PREFERENCES as readonly string[]).includes(f.roundingPreference))
    errors.push('invoices.settings.errors.rounding');
  if (!isNumeric(f.position) || !Number.isInteger(num(f.position)) || num(f.position) < 0)
    errors.push('invoices.settings.errors.position');
  errors.push(...effectiveDateErrors(f.effectiveDate, today));
  return errors;
}

/** The exact body POST Invoice/settings takes. Validate first — this does not. */
export function assembleSettingsRequest(f: SettingsForm): SetInvoiceSettingsReq {
  return {
    marketingSharePct: num(f.marketingSharePct),
    infrastructure: num(f.infrastructure),
    recoveryPerBoost: num(f.recoveryPerBoost),
    recoveryPerTicket: num(f.recoveryPerTicket),
    effectiveAt: f.effectiveDate.trim() === '' ? null : effectiveAtParam(f.effectiveDate),
  };
}

/**
 * The exact body POST Invoice/settings/partners takes. The suffix is
 * upper-cased: it is the letter on the invoice reference (BB-2026-0801-C),
 * and zinc keys partners case-insensitively, so "c" would silently be the
 * same partner printed differently.
 */
export function assemblePartnerRequest(f: PartnerForm): SetInvoicePartnerReq {
  return {
    suffix: f.suffix.trim().toUpperCase(),
    name: f.name.trim(),
    roundingPreference: f.roundingPreference,
    active: f.active,
    position: num(f.position),
    effectiveAt: f.effectiveDate.trim() === '' ? null : effectiveAtParam(f.effectiveDate),
  };
}

// ---- KTMB fare -------------------------------------------------------------
//
// What KTMB charges per ticket, per direction, in ringgit. Every invoice prices
// its tickets at the fare in force for its month (faresFromInputs), so this
// form is what unblocks "A route has tickets but no KTMB fare".
//
// UNLIKE THE AGREED TERMS, BACKDATING IS ALLOWED. The fare is a fact about
// what KTMB charged, and it is entered after the month it applied to — the
// owner learns it from the month's tickets. A backdated row re-prices the P&L
// for the months it covers at once, and a draft once it is previewed and saved
// again (saved drafts hold their figures); issued invoices froze their
// inputs and never move. Insert-only like everything else: a correction is a
// new row at the same effective date, and the newest entry wins.

export type KtmbDirection = 'JToW' | 'WToJ';

/** Which direction(s) one submit sets. 'both' posts two rows. */
export const KTMB_FARE_DIRECTIONS = ['both', 'JToW', 'WToJ'] as const;
export type KtmbFareDirection = (typeof KTMB_FARE_DIRECTIONS)[number];

/** zinc caps the fare at RM 10,000 (SetKtmbCostReqValidator). */
export const KTMB_FARE_MAX = 10_000;

/** POST Booking/ktmb-cost. effectiveAt null = immediately. */
export interface SetKtmbCostReq {
  direction: KtmbDirection;
  cost: number;
  effectiveAt: string | null;
}

/** One row of GET Booking/ktmb-cost/history (zinc KtmbCostChangeRes). */
export interface KtmbCostChangeRes {
  id: string;
  direction: string;
  cost: number;
  effectiveAt: string;
  createdAt: string;
}

/**
 * The fare form as the inputs bind it. cost is `unknown` because the shadcn
 * Input hands back strings (see assemblePreviewRequest). effectiveDate is an
 * SGT calendar day, dd-mm-yyyy, or blank for "now".
 */
export interface KtmbFareForm {
  direction: KtmbFareDirection;
  cost: unknown;
  effectiveDate: string;
}

export function emptyKtmbFareForm(): KtmbFareForm {
  return { direction: 'both', cost: '', effectiveDate: '' };
}

/**
 * Everything wrong with the fare form, as i18n keys. Mirrors zinc's
 * SetKtmbCostReqValidator (0 to 10,000), plus blank-is-not-zero: a blank fare
 * submitted as RM 0 would price every ticket as free and report the month's
 * whole ticket spend as profit. Past dates are fine — see above.
 */
export function ktmbFareErrors(f: KtmbFareForm): string[] {
  const errors: string[] = [];
  if (!(KTMB_FARE_DIRECTIONS as readonly string[]).includes(f.direction)) errors.push('invoices.fare.errors.direction');
  if (!isNumeric(f.cost) || num(f.cost) < 0 || num(f.cost) > KTMB_FARE_MAX) errors.push('invoices.fare.errors.cost');
  const date = f.effectiveDate.trim();
  if (date !== '' && realApiDate(date) == null) errors.push('invoices.settings.errors.effectiveDate');
  return errors;
}

/**
 * The exact bodies POST Booking/ktmb-cost takes — one per direction, so
 * "both" is two requests at the same fare and instant. Validate first.
 */
export function assembleKtmbFareRequests(f: KtmbFareForm): SetKtmbCostReq[] {
  const directions: KtmbDirection[] = f.direction === 'both' ? ['JToW', 'WToJ'] : [f.direction];
  const effectiveAt = f.effectiveDate.trim() === '' ? null : effectiveAtParam(f.effectiveDate);
  return directions.map(direction => ({ direction, cost: num(f.cost), effectiveAt }));
}

/** The invoice route key a booking direction prints as. */
export function routeKeyOf(direction: string): string {
  return direction === 'JToW' ? 'jbw' : direction === 'WToJ' ? 'wjb' : direction;
}

export type KtmbFareStatus = 'current' | 'upcoming' | 'superseded';

export interface KtmbFareHistoryRow extends KtmbCostChangeRes {
  /**
   * current = the fare in force right now for its direction; upcoming = not
   * effective yet; superseded = a later row (or a newer correction at the
   * same instant) has replaced it. A superseded row still priced the months
   * before its replacement.
   */
  status: KtmbFareStatus;
}

/**
 * The fare history for display, newest effective first, each row labelled
 * with where it stands now. Same winner rule as zinc's KtmbCostSchedule:
 * newest EffectiveAt, then newest CreatedAt, then Id.
 */
export function ktmbFareHistory(rows: KtmbCostChangeRes[], now: Date): KtmbFareHistoryRow[] {
  const at = (s: string) => new Date(s).getTime();
  const sorted = [...rows].sort(
    (a, b) =>
      at(b.effectiveAt) - at(a.effectiveAt) ||
      at(b.createdAt) - at(a.createdAt) ||
      (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
  );
  const seen = new Set<string>();
  // a queued row re-entered at the same instant (a correction) replaces the
  // earlier one before either takes effect
  const queued = new Set<string>();
  return sorted.map(r => {
    if (at(r.effectiveAt) > now.getTime()) {
      const key = `${r.direction}|${at(r.effectiveAt)}`;
      if (queued.has(key)) return { ...r, status: 'superseded' };
      queued.add(key);
      return { ...r, status: 'upcoming' };
    }
    if (seen.has(r.direction)) return { ...r, status: 'superseded' };
    seen.add(r.direction);
    return { ...r, status: 'current' };
  });
}
