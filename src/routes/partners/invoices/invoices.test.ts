import { describe, expect, it } from 'vitest';
import {
  assembleKtmbFareRequests,
  assemblePartnerRequest,
  assemblePreviewRequest,
  assembleSettingsRequest,
  effectiveAtParam,
  blockingReasons,
  byMonthDescending,
  coveragePct,
  fareNote,
  daysInMonth,
  defaultDueDate,
  defaultIssueDate,
  defaultMonth,
  defaultSeq,
  emptyKtmbFareForm,
  emptyManualInputs,
  faresFromInputs,
  fxRate,
  halfFareSgd,
  ktmbFareErrors,
  ktmbFareHistory,
  monthClosed,
  monthName,
  monthParam,
  partnerErrors,
  partnerExists,
  partnerFormFrom,
  payableTotal,
  parseApiDate,
  periodLabel,
  periodMonthParam,
  recentMonths,
  routeKeyOf,
  settingsErrors,
  settingsFormFrom,
  settingsHalves,
  termsReasons,
  statusVariant,
  toApiDate,
  topupsMissing,
  type InvoiceComputedRes,
  type InvoiceInputRouteRes,
  type InvoiceInputRowRes,
  type InvoiceSettingsRes,
  type InvoiceSummaryRes,
  type InvoiceTermsRes,
  type KtmbCostChangeRes,
  type KtmbFareForm,
  type PartnerForm,
  type SettingsForm,
} from './invoices';

// August 2026 as zinc actually gathers it. Every figure below is production —
// the same month the second pair of invoices (BB-2026-0801-C / -Z) was issued
// from, so a change that breaks the assembly breaks against a real document
// rather than a made-up one.
const AUGUST_INPUTS: InvoiceInputRowRes = {
  month: '08-2026',
  grossDeposits: 70413,
  fees: { gateway: 1565, paymentMethod: 1561.85 },
  refundFeesExcluded: 57.5,
  routes: [
    {
      key: 'jbw',
      direction: 1,
      tickets: 2879,
      revenue: 29169,
      terminated: { count: 212, keptRevenue: 1065 },
      priority: { paid: 104, fee: 1040, free: 37 },
    },
    {
      key: 'wjb',
      direction: 2,
      tickets: 2386,
      revenue: 24050,
      terminated: { count: 182, keptRevenue: 922.5 },
      priority: { paid: 164, fee: 1640, free: 57 },
    },
  ],
  withdrawals: { count: 69, total: 3183, income: 127.32, withFee: 69 },
  topups: { myr: 45000, sgd: 14309.49 },
};

const TERMS: InvoiceTermsRes = {
  marketingSharePct: 50,
  infrastructure: 500,
  recoveryPerBoost: 10,
  recoveryPerTicket: 3,
  partners: [
    { suffix: 'C', name: 'CLEON', roundingPreference: 'down' },
    { suffix: 'Z', name: 'ZOEY', roundingPreference: 'up' },
  ],
};

const AUGUST_FARES = { jbw: 5, wjb: 16.15 };

const AUGUST = { year: 2026, month: 8 };

describe('dates', () => {
  it('reports the length of the invoiced month', () => {
    expect(daysInMonth({ year: 2026, month: 8 })).toBe(31);
    expect(daysInMonth({ year: 2026, month: 6 })).toBe(30);
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28);
    // A leap February would shorten the period line by a day if this were
    // hard-coded — the label prints on the document.
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29);
  });

  it('uses zincs month-precision wire format', () => {
    expect(monthParam(AUGUST)).toBe('08-2026');
    expect(monthParam({ year: 2026, month: 12 })).toBe('12-2026');
  });

  // ISO over the wire is a 400 from zinc. This is the trap the P&L page
  // already documents, repeated here because the failure is a rejected
  // request rather than a wrong number and looks like an outage.
  it('sends dates as dd-MM-yyyy, not ISO', () => {
    expect(toApiDate({ year: 2026, month: 9, day: 2 })).toBe('02-09-2026');
    expect(periodMonthParam(AUGUST)).toBe('01-08-2026');
  });

  it('round-trips a wire date', () => {
    expect(parseApiDate('02-09-2026')).toEqual({ year: 2026, month: 9, day: 2 });
    expect(parseApiDate('2026-09-02')).toBeNull();
    expect(parseApiDate(null)).toBeNull();
  });

  it('defaults the issue date to the 2nd of the following month', () => {
    // exactly what August's invoice printed
    expect(defaultIssueDate(AUGUST)).toBe('02-09-2026');
  });

  it('rolls the year over in December', () => {
    expect(defaultIssueDate({ year: 2026, month: 12 })).toBe('02-01-2027');
  });

  it('defaults the due date to 14 days after issue', () => {
    expect(defaultDueDate('02-09-2026')).toBe('16-09-2026');
  });

  it('carries the due date into the next month', () => {
    expect(defaultDueDate('25-09-2026')).toBe('09-10-2026');
  });

  it('prints the period the way the document does', () => {
    expect(periodLabel(AUGUST)).toBe('1–31 Aug 2026');
    expect(monthName(AUGUST)).toBe('August 2026');
  });

  it('numbers the first invoice of a month 01', () => {
    // June, July and August were 0601 / 0701 / 0801
    expect(defaultSeq({ year: 2026, month: 6 })).toBe('0601');
    expect(defaultSeq(AUGUST)).toBe('0801');
    expect(defaultSeq(AUGUST, 2)).toBe('0802');
  });
});

describe('the measured FX rate', () => {
  it('is SGD billed over MYR loaded', () => {
    // August: 45,000 RM cost 14,309.49 SGD. The document printed 0.31799 at
    // 5dp, but the full-precision value is what every fare is multiplied by.
    expect(fxRate(AUGUST_INPUTS.topups)).toBeCloseTo(0.3179886667, 9);
    expect(Number(fxRate(AUGUST_INPUTS.topups).toFixed(5))).toBe(0.31799);
  });

  // The reason zinc reports two sums rather than a rate: the blend must be
  // sum-over-sum across the month. This asserts the page does not re-derive it
  // some other way.
  it('blends the whole month rather than averaging days', () => {
    const blended = fxRate({ myr: 10_000 + 18_100, sgd: 3200 + 5785.64 });
    const averagedDaily = (3200 / 10_000 + 5785.64 / 18_100) / 2;
    expect(blended).not.toBeCloseTo(averagedDaily, 6);
  });

  it('reports a month with no top-ups as missing rather than a rate of zero', () => {
    expect(topupsMissing({ myr: 0, sgd: 0 })).toBe(true);
    expect(fxRate({ myr: 0, sgd: 0 })).toBe(0);
    expect(topupsMissing(AUGUST_INPUTS.topups)).toBe(false);
  });
});

describe('faresFromInputs', () => {
  const withFares = (jbw: number | null | undefined, wjb: number | null | undefined): InvoiceInputRowRes => ({
    ...AUGUST_INPUTS,
    routes: [
      { ...AUGUST_INPUTS.routes[0], ktmbFare: jbw },
      { ...AUGUST_INPUTS.routes[1], ktmbFare: wjb },
    ],
  });

  // The month's own fare, keyed by the route it was gathered for — so the two
  // directions cannot be swapped (2,879 JB→Woodlands tickets at RM 16.15
  // would still look like a complete invoice).
  it('reads each route’s fare for the invoiced month', () => {
    expect(faresFromInputs(withFares(5, 16.15))).toEqual(AUGUST_FARES);
  });

  it('reports a month with no fare as zero rather than guessing', () => {
    // Zero is what blockingReasons refuses on. Today's fare would be a wrong
    // cost for a past month that looks right.
    expect(faresFromInputs(withFares(5, null))).toEqual({ jbw: 5, wjb: 0 });
    expect(faresFromInputs(withFares(undefined, undefined))).toEqual({ jbw: 0, wjb: 0 });
    expect(faresFromInputs(null)).toEqual({ jbw: 0, wjb: 0 });
  });

  it('keeps a configured zero as zero, which still blocks', () => {
    const inputs = withFares(0, 16.15);
    expect(faresFromInputs(inputs)).toEqual({ jbw: 0, wjb: 16.15 });
    expect(blockingReasons(inputs, TERMS, faresFromInputs(inputs))).toContain('invoices.blocked.noFare');
  });

  it('unblocks once the month has a fare on every route with tickets', () => {
    const inputs = withFares(5, 16.15);
    expect(blockingReasons(inputs, TERMS, faresFromInputs(inputs))).not.toContain('invoices.blocked.noFare');
  });
});

describe('halfFareSgd', () => {
  // The KTMB cost written off on terminations. Checked against August's
  // issued invoice, which printed 168.53 and 467.33.
  it('reproduces the figures on the issued August invoice', () => {
    const rate = fxRate(AUGUST_INPUTS.topups);
    expect(halfFareSgd(212, 5, rate)).toBe(168.53);
    expect(halfFareSgd(182, 16.15, rate)).toBe(467.33);
  });

  it('is zero when nothing terminated', () => {
    expect(halfFareSgd(0, 16.15, 0.3179886)).toBe(0);
  });
});

describe('assemblePreviewRequest', () => {
  const req = assemblePreviewRequest({
    month: AUGUST,
    inputs: AUGUST_INPUTS,
    terms: TERMS,
    fares: AUGUST_FARES,
    manual: emptyManualInputs(AUGUST_INPUTS),
    issueDate: '02-09-2026',
    dueDate: '16-09-2026',
    seq: '0801',
  });

  it('labels the period as the document prints it', () => {
    expect(req.period).toEqual({ label: '1–31 Aug 2026', monthName: 'August 2026', seq: '0801' });
  });

  it('passes the gathered month through untouched', () => {
    expect(req.grossDeposits).toBe(70413);
    expect(req.fees).toEqual({ gateway: 1565, paymentMethod: 1561.85 });
    expect(req.refundFeesExcluded).toBe(57.5);
    expect(req.withdrawals).toEqual({ count: 69, total: 3183 });
    expect(req.withdrawalFee).toEqual({ income: 127.32, withFee: 69, count: 69 });
  });

  it('sends the top-ups as one blended row', () => {
    // The engine only ever uses the ratio of the totals; the itemized table on
    // the document is presentation, and zinc reports the pair.
    expect(req.topups).toEqual([{ date: '', rm: 45000, sgd: 14309.49 }]);
  });

  it('labels routes as the invoice prints them and carries the fare', () => {
    const jbw = req.routes.find(r => r.key === 'jbw')!;
    const wjb = req.routes.find(r => r.key === 'wjb')!;
    expect(jbw.label).toBe('JB → WOODLANDS');
    expect(jbw.short).toBe('JB→W');
    expect(wjb.fareRm).toBe(16.15);
    expect(jbw.tickets).toBe(2879);
    expect(jbw.revenue).toBe(29169);
  });

  it('converts the terminated write-off to SGD before it crosses the wire', () => {
    // The engine is told the top-ups, not the rate, so this has to be SGD
    // here. These are the figures on the issued invoice.
    expect(req.routes.find(r => r.key === 'jbw')!.terminated).toEqual({
      count: 212,
      keptRevenue: 1065,
      halfFareSgd: 168.53,
    });
    expect(req.routes.find(r => r.key === 'wjb')!.terminated.halfFareSgd).toBe(467.33);
  });

  it('takes the commercial terms from settings, never from the page', () => {
    expect(req.marketingSharePct).toBe(50);
    expect(req.infrastructure).toBe(500);
    expect(req.partners).toEqual([
      { suffix: 'C', name: 'CLEON', roundingPreference: 'down' },
      { suffix: 'Z', name: 'ZOEY', roundingPreference: 'up' },
    ]);
  });

  it('carries the priority fees per route', () => {
    expect(req.priority.perRoute).toEqual({
      jbw: { paid: 104, fee: 1040, free: 37 },
      wjb: { paid: 164, fee: 1640, free: 57 },
    });
  });

  it('never pins an override for a month being generated now', () => {
    // Both exist only to reproduce an already-issued document. Pinning one
    // here would make the engine print a figure it did not compute.
    expect(req.feeRateOverride).toBeNull();
    expect(req.wastedFeeOverride).toBeNull();
  });

  it('omits the recovery entirely when none is claimed', () => {
    // null, not a zeroed object: the invoice prints the recovery section only
    // when it applies, and a zeroed one would add an empty section.
    expect(req.partnerRecovery).toBeNull();
  });

  it('applies the recovery rates from settings when a recovery is claimed', () => {
    const withRecovery = assemblePreviewRequest({
      month: AUGUST,
      inputs: AUGUST_INPUTS,
      terms: TERMS,
      fares: AUGUST_FARES,
      manual: { ...emptyManualInputs(AUGUST_INPUTS), recovery: { freeBoosts: 0, tickets: 139 } },
      issueDate: '02-09-2026',
      dueDate: '16-09-2026',
      seq: '0801',
    });
    expect(withRecovery.partnerRecovery).toEqual({
      freeBoosts: 0,
      tickets: 139,
      perBoost: 10,
      perTicket: 3,
    });
  });

  it('defaults surcharge coverage to the tickets it has', () => {
    // Coverage below 100% means the surcharge figures are UNDERSTATED and the
    // document says so. Defaulting to the ticket count claims full coverage,
    // which is true when the operator enters the lines from the same source.
    expect(emptyManualInputs(AUGUST_INPUTS).surchargeCoverage).toEqual({
      withBreakdown: 5265,
      total: 5265,
    });
  });

  it('falls back to a zero fare rather than inventing one', () => {
    // A missing fare is caught by blockingReasons; assembly must not paper
    // over it with a guess, because a guessed fare is a wrong payable that
    // looks right.
    const noFare = assemblePreviewRequest({
      month: AUGUST,
      inputs: AUGUST_INPUTS,
      terms: TERMS,
      fares: {},
      manual: emptyManualInputs(AUGUST_INPUTS),
      issueDate: '02-09-2026',
      dueDate: '16-09-2026',
      seq: '0801',
    });
    expect(noFare.routes.every(r => r.fareRm === 0)).toBe(true);
  });

  it('coerces manual figures typed as text into numbers', () => {
    // The shadcn Input forwards type="number" through $$restProps, so Svelte
    // never applies its numeric coercion and every manual binding arrives
    // here as a string. Left alone these reach the server as "1200", and a
    // string in a money field is either a validation error or a wrong figure.
    const typed = assemblePreviewRequest({
      month: AUGUST,
      inputs: AUGUST_INPUTS,
      terms: TERMS,
      fares: AUGUST_FARES,
      manual: {
        ...emptyManualInputs(AUGUST_INPUTS),
        priorityKept: { amount: '470' as unknown as number, count: '47' as unknown as number },
        netTransfers: '-55' as unknown as number,
        promotional: { count: '3' as unknown as number, amount: '30.5' as unknown as number },
        duplicates: { count: '2' as unknown as number, refunded: '20' as unknown as number },
        recovery: { freeBoosts: '4' as unknown as number, tickets: '139' as unknown as number },
      },
      issueDate: '02-09-2026',
      dueDate: '16-09-2026',
      seq: '0801',
    });

    expect(typed.priority.keptOnCancelled).toBe(470);
    expect(typed.priority.keptOnCancelledCount).toBe(47);
    expect(typed.netTransfers).toBe(-55);
    expect(typed.promotional).toEqual({ count: 3, amount: 30.5 });
    expect(typed.duplicates).toEqual({ count: 2, refunded: 20 });
    expect(typed.partnerRecovery?.freeBoosts).toBe(4);
    expect(typed.partnerRecovery?.tickets).toBe(139);
  });

  it('reads an emptied box as zero rather than NaN', () => {
    // Clearing a field leaves "" behind. Number("") is 0, but Number("-") --
    // which exists for as long as it takes to type a negative -- is NaN, and
    // NaN serialises to JSON null. The operator would get a validation error
    // naming a field they cannot see.
    const blanked = assemblePreviewRequest({
      month: AUGUST,
      inputs: AUGUST_INPUTS,
      terms: TERMS,
      fares: AUGUST_FARES,
      manual: {
        ...emptyManualInputs(AUGUST_INPUTS),
        netTransfers: '' as unknown as number,
        promotional: { count: '-' as unknown as number, amount: 'abc' as unknown as number },
      },
      issueDate: '02-09-2026',
      dueDate: '16-09-2026',
      seq: '0801',
    });

    expect(blanked.netTransfers).toBe(0);
    expect(blanked.promotional).toEqual({ count: 0, amount: 0 });
  });
});

describe('blockingReasons', () => {
  it('passes a complete month', () => {
    expect(blockingReasons(AUGUST_INPUTS, TERMS, AUGUST_FARES)).toEqual([]);
  });

  it('refuses a month with no top-up data', () => {
    // Every fare converts at this rate. A zero would report the entire KTMB
    // cost as nil and overstate profit by the whole ticket spend.
    const reasons = blockingReasons({ ...AUGUST_INPUTS, topups: { myr: 0, sgd: 0 } }, TERMS, AUGUST_FARES);
    expect(reasons).toContain('invoices.blocked.noTopups');
  });

  it('refuses a month with a missing fare', () => {
    expect(blockingReasons(AUGUST_INPUTS, TERMS, { jbw: 5 })).toContain('invoices.blocked.noFare');
  });

  it('ignores a missing fare on a route that sold nothing', () => {
    const quiet: InvoiceInputRowRes = {
      ...AUGUST_INPUTS,
      routes: [AUGUST_INPUTS.routes[0], { ...AUGUST_INPUTS.routes[1], tickets: 0, revenue: 0 }],
    };
    expect(blockingReasons(quiet, TERMS, { jbw: 5 })).toEqual([]);
  });

  it('refuses when the terms are not configured', () => {
    expect(blockingReasons(AUGUST_INPUTS, null, AUGUST_FARES)).toContain('invoices.blocked.noTerms');
  });

  it('refuses when there is nobody to pay', () => {
    expect(blockingReasons(AUGUST_INPUTS, { ...TERMS, partners: [] }, AUGUST_FARES)).toContain(
      'invoices.blocked.noPartners',
    );
  });

  it('refuses an empty month', () => {
    const empty: InvoiceInputRowRes = {
      ...AUGUST_INPUTS,
      routes: AUGUST_INPUTS.routes.map(r => ({ ...r, tickets: 0, revenue: 0 })),
    };
    expect(blockingReasons(empty, TERMS, AUGUST_FARES)).toContain('invoices.blocked.noTickets');
  });

  // One round trip per problem is how an operator gives up and edits JSON by
  // hand again.
  it('reports every problem at once', () => {
    const reasons = blockingReasons({ ...AUGUST_INPUTS, topups: { myr: 0, sgd: 0 } }, null, {});
    expect(reasons).toEqual(
      expect.arrayContaining(['invoices.blocked.noTopups', 'invoices.blocked.noTerms', 'invoices.blocked.noFare']),
    );
  });
});

describe('payableTotal', () => {
  it('sums what the partners are actually transferred', () => {
    // August: 9,159.38 each, which is what was paid.
    const computed = {
      result: {
        shares: [
          {
            name: 'CLEON',
            suffix: 'C',
            roundingPreference: 'down',
            pct: 25,
            earned: 9367.88,
            advance: 208.5,
            amount: 9159.38,
          },
          {
            name: 'ZOEY',
            suffix: 'Z',
            roundingPreference: 'up',
            pct: 25,
            earned: 9367.88,
            advance: 208.5,
            amount: 9159.38,
          },
        ],
      },
    } as InvoiceComputedRes;
    expect(payableTotal(computed)).toBe(18318.76);
  });
});

describe('byMonthDescending', () => {
  const row = (periodMonth: string, seq: string): InvoiceSummaryRes => ({
    id: seq,
    periodMonth,
    seq,
    status: 'issued',
    ticketBasis: 'statusToday',
    engineVersion: 1,
    issueDate: '02-09-2026',
    dueDate: '16-09-2026',
    netProfit: 0,
    poolTotal: 0,
    createdAt: '2026-09-02T00:00:00Z',
    issuedAt: null,
  });

  it('puts the newest month first', () => {
    const sorted = [row('01-06-2026', '0601'), row('01-08-2026', '0801'), row('01-07-2026', '0701')].sort(
      byMonthDescending,
    );
    expect(sorted.map(r => r.seq)).toEqual(['0801', '0701', '0601']);
  });

  it('sorts across a year boundary by year, not month number', () => {
    const sorted = [row('01-01-2027', '0101'), row('01-12-2026', '1201')].sort(byMonthDescending);
    expect(sorted.map(r => r.seq)).toEqual(['0101', '1201']);
  });

  it('puts a re-issue above the original for the same month', () => {
    const sorted = [row('01-08-2026', '0801'), row('01-08-2026', '0802')].sort(byMonthDescending);
    expect(sorted.map(r => r.seq)).toEqual(['0802', '0801']);
  });
});

// ---- the month picker -----------------------------------------------------

describe('defaultMonth', () => {
  // The current month is never the answer. Its gateway fees have not finished
  // posting and its bookings are still moving, so invoicing it would settle a
  // figure that is still changing.
  it('is the month before today', () => {
    expect(defaultMonth({ year: 2026, month: 9 })).toEqual({ year: 2026, month: 8 });
  });

  it('walks back into the previous year in January', () => {
    expect(defaultMonth({ year: 2027, month: 1 })).toEqual({ year: 2026, month: 12 });
  });
});

describe('recentMonths', () => {
  it('counts backwards from the given month, newest first', () => {
    expect(recentMonths({ year: 2026, month: 8 }, 3)).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 7 },
      { year: 2026, month: 6 },
    ]);
  });

  it('crosses the year boundary without producing a month zero', () => {
    const months = recentMonths({ year: 2026, month: 2 }, 4);
    expect(months).toEqual([
      { year: 2026, month: 2 },
      { year: 2026, month: 1 },
      { year: 2025, month: 12 },
      { year: 2025, month: 11 },
    ]);
    expect(months.every(m => m.month >= 1 && m.month <= 12)).toBe(true);
  });

  // Every entry is a picker option keyed by monthParam, so a duplicate would
  // be a duplicate key and a repeated month in the list.
  it('produces a full run of distinct months', () => {
    const months = recentMonths({ year: 2026, month: 8 }, 18);
    expect(months).toHaveLength(18);
    expect(new Set(months.map(monthParam)).size).toBe(18);
  });
});

describe('statusVariant', () => {
  it('marks a void invoice destructively and a draft quietly', () => {
    expect(statusVariant('issued')).toBe('default');
    expect(statusVariant('void')).toBe('destructive');
    expect(statusVariant('draft')).toBe('secondary');
  });

  // An unknown status must not read as issued: the badge is how an operator
  // decides whether a month is settled.
  it('does not present an unrecognised status as issued', () => {
    expect(statusVariant('something_new')).toBe('secondary');
  });
});

describe('settings form', () => {
  const today = { year: 2026, month: 10, day: 8 };
  const live: InvoiceTermsRes = {
    marketingSharePct: 40,
    infrastructure: 600,
    recoveryPerBoost: 12,
    recoveryPerTicket: 4,
    partners: [{ suffix: 'C', name: 'CLEON', roundingPreference: 'down' }],
  };

  const validTerms = (over: Partial<SettingsForm> = {}): SettingsForm => ({
    marketingSharePct: '50',
    infrastructure: '500',
    recoveryPerBoost: '10',
    recoveryPerTicket: '3',
    effectiveDate: '',
    ...over,
  });

  const validPartner = (over: Partial<PartnerForm> = {}): PartnerForm => ({
    suffix: 'Z',
    name: 'ZOEY',
    roundingPreference: 'up',
    active: true,
    position: '1',
    effectiveDate: '',
    ...over,
  });

  // The terms the issued June–August invoices used (invoices/data/2026-08.json).
  it('suggests the issued invoices terms when none are in force', () => {
    const { form, suggested } = settingsFormFrom(null);
    expect(suggested).toBe(true);
    expect(form).toEqual({
      marketingSharePct: 50,
      infrastructure: 500,
      recoveryPerBoost: 10,
      recoveryPerTicket: 3,
      effectiveDate: '',
    });
  });

  it('starts from the terms in force once there are some', () => {
    const { form, suggested } = settingsFormFrom(live);
    expect(suggested).toBe(false);
    expect(form.marketingSharePct).toBe(40);
    expect(form.infrastructure).toBe(600);
  });

  it('suggests each issued-invoice partner in turn, then a blank row', () => {
    expect(partnerFormFrom(null).form).toMatchObject({
      suffix: 'C',
      name: 'CLEON',
      roundingPreference: 'down',
      position: 0,
    });
    expect(partnerFormFrom(live).form).toMatchObject({
      suffix: 'Z',
      name: 'ZOEY',
      roundingPreference: 'up',
      position: 1,
    });
    const both = { ...live, partners: [...live.partners, { suffix: 'Z', name: 'ZOEY', roundingPreference: 'up' }] };
    const { form, suggested } = partnerFormFrom(both);
    expect(suggested).toBe(false);
    expect(form).toMatchObject({ suffix: '', name: '', position: 2, active: true });
  });

  it('knows an existing suffix is an update, case-insensitively', () => {
    expect(partnerExists(live, ' c ')).toBe(true);
    expect(partnerExists(live, 'Z')).toBe(false);
    expect(partnerExists(null, 'C')).toBe(false);
    expect(partnerExists(live, '')).toBe(false);
  });

  // String bindings from the shadcn Input must reach the wire as numbers.
  it('coerces string inputs to numbers and sends a blank date as immediate', () => {
    expect(assembleSettingsRequest(validTerms())).toEqual({
      marketingSharePct: 50,
      infrastructure: 500,
      recoveryPerBoost: 10,
      recoveryPerTicket: 3,
      effectiveAt: null,
    });
  });

  it('sends an effective date as midnight Singapore time in UTC', () => {
    expect(effectiveAtParam('01-11-2026')).toBe('2026-10-31T16:00:00.000Z');
    expect(assembleSettingsRequest(validTerms({ effectiveDate: '01-11-2026' })).effectiveAt).toBe(
      '2026-10-31T16:00:00.000Z',
    );
    expect(effectiveAtParam('2026-11-01')).toBeNull();
  });

  it('upper-cases and trims the partner suffix and name', () => {
    expect(assemblePartnerRequest(validPartner({ suffix: ' z ', name: ' ZOEY ', position: '3' }))).toEqual({
      suffix: 'Z',
      name: 'ZOEY',
      roundingPreference: 'up',
      active: true,
      position: 3,
      effectiveAt: null,
    });
  });

  it('accepts valid terms and partners', () => {
    expect(settingsErrors(validTerms(), today)).toEqual([]);
    expect(settingsErrors(validTerms({ effectiveDate: '09-10-2026' }), today)).toEqual([]);
    expect(partnerErrors(validPartner(), today)).toEqual([]);
  });

  // Blank must not pass as zero: a blank share would pay nobody.
  it('rejects blank and out-of-range terms, every reason at once', () => {
    expect(
      settingsErrors(
        {
          marketingSharePct: '',
          infrastructure: '-1',
          recoveryPerBoost: 'abc',
          recoveryPerTicket: '',
          effectiveDate: '',
        },
        today,
      ),
    ).toEqual([
      'invoices.settings.errors.share',
      'invoices.settings.errors.infrastructure',
      'invoices.settings.errors.recoveryPerBoost',
      'invoices.settings.errors.recoveryPerTicket',
    ]);
    expect(settingsErrors(validTerms({ marketingSharePct: '100.5' }), today)).toEqual([
      'invoices.settings.errors.share',
    ]);
    expect(settingsErrors(validTerms({ marketingSharePct: 100 }), today)).toEqual([]);
  });

  it('refuses a malformed, impossible or non-future effective date', () => {
    expect(settingsErrors(validTerms({ effectiveDate: '2026-11-01' }), today)).toEqual([
      'invoices.settings.errors.effectiveDate',
    ]);
    expect(settingsErrors(validTerms({ effectiveDate: '31-02-2027' }), today)).toEqual([
      'invoices.settings.errors.effectiveDate',
    ]);
    expect(settingsErrors(validTerms({ effectiveDate: '08-10-2026' }), today)).toEqual([
      'invoices.settings.errors.effectivePast',
    ]);
    expect(settingsErrors(validTerms({ effectiveDate: '01-01-2026' }), today)).toEqual([
      'invoices.settings.errors.effectivePast',
    ]);
  });

  it('mirrors zincs partner validator', () => {
    expect(
      partnerErrors(validPartner({ suffix: '', name: '', roundingPreference: 'sideways', position: '-1' }), today),
    ).toEqual([
      'invoices.settings.errors.suffix',
      'invoices.settings.errors.name',
      'invoices.settings.errors.rounding',
      'invoices.settings.errors.position',
    ]);
    expect(partnerErrors(validPartner({ suffix: 'TOOLONGXX' }), today)).toEqual(['invoices.settings.errors.suffix']);
    expect(partnerErrors(validPartner({ position: '1.5' }), today)).toEqual(['invoices.settings.errors.position']);
    expect(partnerErrors(validPartner({ position: '' }), today)).toEqual(['invoices.settings.errors.position']);
  });
});

describe('KTMB fare form', () => {
  const form = (over: Partial<KtmbFareForm> = {}): KtmbFareForm => ({
    direction: 'both',
    cost: '16.15',
    effectiveDate: '',
    ...over,
  });

  it('starts empty, for both directions, effective now', () => {
    expect(emptyKtmbFareForm()).toEqual({ direction: 'both', cost: '', effectiveDate: '' });
    // a blank fare must not be submittable as RM 0
    expect(ktmbFareErrors(emptyKtmbFareForm())).toEqual(['invoices.fare.errors.cost']);
  });

  it('accepts a past date — the fare is entered after the month it applied to', () => {
    expect(ktmbFareErrors(form({ effectiveDate: '01-09-2026' }))).toEqual([]);
    expect(ktmbFareErrors(form({ effectiveDate: '01-06-2026' }))).toEqual([]);
  });

  it('accepts a future date and blank for now', () => {
    expect(ktmbFareErrors(form({ effectiveDate: '01-01-2027' }))).toEqual([]);
    expect(ktmbFareErrors(form({ effectiveDate: '  ' }))).toEqual([]);
  });

  it('rejects a date that is not a real dd-mm-yyyy day', () => {
    expect(ktmbFareErrors(form({ effectiveDate: '2026-09-01' }))).toEqual(['invoices.settings.errors.effectiveDate']);
    expect(ktmbFareErrors(form({ effectiveDate: '31-09-2026' }))).toEqual(['invoices.settings.errors.effectiveDate']);
  });

  it('mirrors zinc’s 0–10,000 range, and allows a deliberate zero', () => {
    expect(ktmbFareErrors(form({ cost: '0' }))).toEqual([]);
    expect(ktmbFareErrors(form({ cost: '10000' }))).toEqual([]);
    expect(ktmbFareErrors(form({ cost: '-1' }))).toEqual(['invoices.fare.errors.cost']);
    expect(ktmbFareErrors(form({ cost: '10000.01' }))).toEqual(['invoices.fare.errors.cost']);
    expect(ktmbFareErrors(form({ cost: 'abc' }))).toEqual(['invoices.fare.errors.cost']);
  });

  it('rejects an unknown direction', () => {
    expect(ktmbFareErrors(form({ direction: 'Sideways' as KtmbFareForm['direction'] }))).toEqual([
      'invoices.fare.errors.direction',
    ]);
  });

  it('posts two rows for both directions at the same fare and instant', () => {
    // 01-09-2026 midnight SGT = 31 Aug 16:00 UTC
    expect(assembleKtmbFareRequests(form({ effectiveDate: '01-09-2026' }))).toEqual([
      { direction: 'JToW', cost: 16.15, effectiveAt: '2026-08-31T16:00:00.000Z' },
      { direction: 'WToJ', cost: 16.15, effectiveAt: '2026-08-31T16:00:00.000Z' },
    ]);
  });

  it('posts one row for a single direction, effective now when blank', () => {
    // the string binding must leave as a number, not "5"
    expect(assembleKtmbFareRequests(form({ direction: 'JToW', cost: '5' }))).toEqual([
      { direction: 'JToW', cost: 5, effectiveAt: null },
    ]);
    expect(assembleKtmbFareRequests(form({ direction: 'WToJ' }))).toEqual([
      { direction: 'WToJ', cost: 16.15, effectiveAt: null },
    ]);
  });

  it('maps booking directions onto the invoice route keys', () => {
    expect(routeKeyOf('JToW')).toBe('jbw');
    expect(routeKeyOf('WToJ')).toBe('wjb');
  });
});

describe('ktmbFareHistory', () => {
  const now = new Date('2026-10-09T04:00:00Z');
  const row = (
    id: string,
    direction: string,
    cost: number,
    effectiveAt: string,
    createdAt = effectiveAt,
  ): KtmbCostChangeRes => ({
    id,
    direction,
    cost,
    effectiveAt,
    createdAt,
  });

  it('lists every change newest effective first, labelling where each stands', () => {
    const rows = [
      row('a', 'JToW', 17.5, '2026-05-31T16:00:00Z'),
      row('b', 'JToW', 16.05, '2026-06-30T16:00:00Z'),
      row('c', 'WToJ', 16.15, '2026-07-31T16:00:00Z'),
      row('d', 'JToW', 18, '2026-12-31T16:00:00Z'),
    ];
    expect(ktmbFareHistory(rows, now).map(r => [r.id, r.status])).toEqual([
      ['d', 'upcoming'],
      ['c', 'current'],
      ['b', 'current'],
      ['a', 'superseded'],
    ]);
  });

  it('treats a same-date correction as replacing the earlier entry', () => {
    // same effective instant: the newest entry wins, matching zinc
    const rows = [
      row('typo', 'WToJ', 1.615, '2026-08-31T16:00:00Z', '2026-10-01T00:00:00Z'),
      row('fix', 'WToJ', 16.15, '2026-08-31T16:00:00Z', '2026-10-02T00:00:00Z'),
    ];
    expect(ktmbFareHistory(rows, now).map(r => [r.id, r.status])).toEqual([
      ['fix', 'current'],
      ['typo', 'superseded'],
    ]);
  });

  it('marks a queued row corrected at the same future instant as replaced', () => {
    const rows = [
      row('old', 'JToW', 1.8, '2026-12-31T16:00:00Z', '2026-10-01T00:00:00Z'),
      row('new', 'JToW', 18, '2026-12-31T16:00:00Z', '2026-10-02T00:00:00Z'),
      row('other', 'WToJ', 17, '2026-12-31T16:00:00Z', '2026-10-01T00:00:00Z'),
    ];
    expect(ktmbFareHistory(rows, now).map(r => [r.id, r.status])).toEqual([
      ['new', 'upcoming'],
      ['other', 'upcoming'],
      ['old', 'superseded'],
    ]);
  });

  it('is empty when nothing was ever entered', () => {
    expect(ktmbFareHistory([], now)).toEqual([]);
  });
});

describe('measured fare display', () => {
  const route = (over: Partial<InvoiceInputRouteRes> = {}): InvoiceInputRouteRes => ({
    ...AUGUST_INPUTS.routes[1],
    ...over,
  });

  it('names the ticket count a measured fare was averaged over', () => {
    expect(fareNote(route({ ktmbFare: 16.22, ktmbFareSource: 'measured', pricedTickets: 2450 }), true)).toEqual({
      key: 'invoices.gathered.fareMeasured',
      values: { count: 2450 },
    });
  });

  it('says an override was set manually', () => {
    expect(fareNote(route({ ktmbFare: 16.5, ktmbFareSource: 'override' }), true)?.key).toBe(
      'invoices.gathered.fareOverride',
    );
    // an override applies to an open month too
    expect(fareNote(route({ ktmbFare: 16.5, ktmbFareSource: 'override' }), false)?.key).toBe(
      'invoices.gathered.fareOverride',
    );
  });

  it('explains why a fare is missing', () => {
    // open month: wait for it to close
    expect(fareNote(route({ ktmbFare: null, ktmbFareSource: null, pricedTickets: 876 }), false)?.key).toBe(
      'invoices.gathered.fareOpenMonth',
    );
    // closed, some priced but below 99%
    expect(fareNote(route({ ktmbFare: null, ktmbFareSource: null, pricedTickets: 100 }), true)?.key).toBe(
      'invoices.gathered.fareLowCoverage',
    );
    // closed, nothing recorded
    expect(fareNote(route({ ktmbFare: null, ktmbFareSource: null, pricedTickets: 0 }), true)?.key).toBe(
      'invoices.gathered.fareNone',
    );
    // no tickets: nothing to say
    expect(fareNote(route({ tickets: 0, ktmbFare: null }), true)).toBeNull();
  });

  it('shows coverage to one decimal, rounding down so 98.96% never reads as 99%', () => {
    expect(coveragePct(route({ pricedCoverage: 1 }))).toBe(100);
    expect(coveragePct(route({ pricedCoverage: 0.98983 }))).toBe(98.9);
    expect(coveragePct(route({ pricedCoverage: null }))).toBeNull();
    expect(coveragePct(route({}))).toBeNull();
  });

  it('a measured fare unblocks the month', () => {
    const sep: InvoiceInputRowRes = {
      ...AUGUST_INPUTS,
      routes: [
        { ...AUGUST_INPUTS.routes[0], ktmbFare: 5, ktmbFareSource: 'measured' },
        { ...AUGUST_INPUTS.routes[1], ktmbFare: 16.22, ktmbFareSource: 'measured' },
      ],
    };
    expect(blockingReasons(sep, TERMS, faresFromInputs(sep))).toEqual([]);
  });
});

describe('monthClosed', () => {
  const sep = { year: 2026, month: 9 };

  it('closes at midnight Singapore time on the 1st of the next month', () => {
    // 1 Oct 00:00 SGT = 30 Sep 16:00 UTC
    expect(monthClosed(sep, new Date('2026-09-30T15:59:59Z'))).toBe(false);
    expect(monthClosed(sep, new Date('2026-09-30T16:00:00Z'))).toBe(true);
  });

  it('handles December rolling into the next year', () => {
    expect(monthClosed({ year: 2026, month: 12 }, new Date('2026-12-31T15:59:59Z'))).toBe(false);
    expect(monthClosed({ year: 2026, month: 12 }, new Date('2026-12-31T16:00:00Z'))).toBe(true);
  });
});

describe('terms halves', () => {
  const termsRow = {
    id: 't',
    marketingSharePct: 50,
    infrastructure: 500,
    recoveryPerBoost: 10,
    recoveryPerTicket: 3,
    effectiveAt: '2026-10-09T23:01:43Z',
    createdAt: '2026-10-09T23:01:43Z',
  };
  const settings = (over: Partial<InvoiceSettingsRes>): InvoiceSettingsRes => ({
    current: null,
    upcoming: [],
    upcomingPartners: [],
    ...over,
  });

  // production on 10 Oct 2026: four terms rows saved, no partner
  it('names the missing partner rather than the saved terms', () => {
    const s = settings({ currentSettings: termsRow, currentPartners: [] });
    expect(termsReasons(null, s)).toEqual(['invoices.blocked.noPartners']);
    expect(blockingReasons(AUGUST_INPUTS, null, AUGUST_FARES, s)).toEqual(['invoices.blocked.noPartners']);
  });

  it('names the missing terms when only partners exist', () => {
    const s = settings({ currentSettings: null, currentPartners: TERMS.partners });
    expect(termsReasons(null, s)).toEqual(['invoices.blocked.noTerms']);
  });

  it('names both when nothing is configured', () => {
    expect(termsReasons(null, settings({ currentSettings: null, currentPartners: [] }))).toEqual([
      'invoices.blocked.noTerms',
      'invoices.blocked.noPartners',
    ]);
  });

  it('falls back to noTerms against a zinc without the halves', () => {
    expect(termsReasons(null, settings({}))).toEqual(['invoices.blocked.noTerms']);
    expect(termsReasons(null, null)).toEqual(['invoices.blocked.noTerms']);
  });

  it('passes once both are in force', () => {
    expect(termsReasons(TERMS, settings({ current: TERMS }))).toEqual([]);
  });

  it('seeds the forms from the saved half, not the suggestion', () => {
    const halves = settingsHalves(
      settings({ currentSettings: { ...termsRow, infrastructure: 650 }, currentPartners: [] }),
    );
    const { form, suggested } = settingsFormFrom(halves.terms);
    expect(suggested).toBe(false);
    expect(form.infrastructure).toBe(650);
    // no partner yet: the partner form still suggests CLEON first
    expect(partnerFormFrom(halves.partners).form.suffix).toBe('C');
  });

  it('suggests the next partner once one is in force', () => {
    const halves = settingsHalves(
      settings({
        currentSettings: termsRow,
        currentPartners: [{ suffix: 'C', name: 'CLEON', roundingPreference: 'down' }],
      }),
    );
    expect(partnerFormFrom(halves.partners).form.suffix).toBe('Z');
  });
});
