import { describe, expect, it } from 'vitest';
import type { BookingAnalysisPnlRowRes, BookingTerminalPnlRowRes } from '$lib/api/core/data-contracts';
import {
  PNL_TABS,
  completedProfit,
  ebitda,
  estimatedRecoveryCount,
  monthSortKey,
  pickParam,
  pnlCashNet,
  pnlTotals,
  pnlZeroFill,
  terminalTotals,
  terminalZeroFill,
  terminatedProfit,
  toTerminalPnlRow,
  withdrawalProfit,
} from './pnl';

function terminal(over: Partial<BookingTerminalPnlRowRes>): BookingTerminalPnlRowRes {
  return {
    month: '07-2026',
    deposits: 0,
    paymentFees: 0,
    gwRate: 0,
    completed: { count: 0, collected: 0, ktmbCost: 0 },
    terminated: { count: 0, kept: 0, ktmbCostNet: 0, withExactRefund: 0 },
    withdrawals: { count: 0, gross: 0, feeIncome: 0, payoutFees: 0 },
    ...over,
  };
}

function pnl(over: Partial<BookingAnalysisPnlRowRes>): BookingAnalysisPnlRowRes {
  return {
    month: '07-2026',
    deposits: 0,
    withdrawalCount: 0,
    withdrawalTotal: 0,
    withdrawalFeeIncome: 0,
    gatewayFees: 0,
    ticketRevenue: 0,
    ktmbCost: 0,
    ...over,
  };
}

describe('monthSortKey', () => {
  it('turns MM-yyyy into a sortable yyyyMM key', () => {
    expect(monthSortKey('07-2026')).toBe('202607');
    expect(monthSortKey('12-2025') < monthSortKey('01-2026')).toBe(true);
  });

  it('rejects malformed and out-of-range months', () => {
    expect(monthSortKey('')).toBe('');
    expect(monthSortKey('2026-07')).toBe('');
    expect(monthSortKey('13-2026')).toBe('');
    expect(monthSortKey('00-2026')).toBe('');
  });
});

describe('completedProfit', () => {
  it('is collected − ktmbCost − gwRate×collected', () => {
    // every collected dollar carries its gateway-fee share (the month's
    // blended rate) to the completion event: 1000 − 300 − 0.03×1000 = 670
    expect(completedProfit({ collected: 1000, ktmbCost: 300, gwRate: 0.03 })).toBe(670);
  });

  it('negative when KTMB cost + fee share exceed the collected amount', () => {
    expect(completedProfit({ collected: 100, ktmbCost: 120, gwRate: 0.05 })).toBe(-25);
  });

  it('zero on an all-zeros month', () => {
    expect(completedProfit({ collected: 0, ktmbCost: 0, gwRate: 0 })).toBe(0);
  });
});

describe('terminatedProfit', () => {
  it('is kept − ktmbCostNet − gwRate×kept', () => {
    // 200 kept, 50 of KTMB cost not recovered, 0.03×200 fee share = 144
    expect(terminatedProfit({ kept: 200, ktmbCostNet: 50, gwRate: 0.03 })).toBe(144);
  });

  it('negative when the unrecovered KTMB cost exceeds what was kept', () => {
    expect(terminatedProfit({ kept: 10, ktmbCostNet: 40, gwRate: 0 })).toBe(-30);
  });
});

describe('withdrawalProfit', () => {
  it('is feeIncome − gwRate×gross − payoutFees', () => {
    // withdrawn principal leaves with its gateway-fee share:
    // 40 − 0.03×340 − 8 = 21.8
    expect(withdrawalProfit({ feeIncome: 40, withdrawalGross: 340, gwRate: 0.03, payoutFees: 8 })).toBeCloseTo(21.8);
  });

  it('negative when fee income does not cover the channel costs', () => {
    expect(withdrawalProfit({ feeIncome: 1, withdrawalGross: 500, gwRate: 0.03, payoutFees: 5 })).toBeCloseTo(-19);
  });
});

describe('ebitda', () => {
  it('sums the three terminal-event profit lines', () => {
    const r = toTerminalPnlRow(
      terminal({
        gwRate: 0.03,
        completed: { count: 10, collected: 1000, ktmbCost: 300 },
        terminated: { count: 2, kept: 200, ktmbCostNet: 50, withExactRefund: 2 },
        withdrawals: { count: 5, gross: 340, feeIncome: 40, payoutFees: 8 },
      }),
    );
    // 670 + 144 + 21.8
    expect(ebitda(r)).toBeCloseTo(835.8);
  });
});

describe('estimatedRecoveryCount', () => {
  it('counts terminated bookings without an exact KTMB refund', () => {
    expect(estimatedRecoveryCount({ terminatedCount: 5, withExactRefund: 3 })).toBe(2);
    expect(estimatedRecoveryCount({ terminatedCount: 5, withExactRefund: 5 })).toBe(0);
  });

  it('never goes negative on a defective payload', () => {
    expect(estimatedRecoveryCount({ terminatedCount: 2, withExactRefund: 4 })).toBe(0);
  });
});

describe('terminalZeroFill', () => {
  it('inserts an all-zeros row for every calendar month in the range', () => {
    // zinc only returns months with activity; the page reads better as a
    // continuous series, so the renderer wants one row per month.
    const rows = terminalZeroFill([terminal({ month: '02-2026', deposits: 100 })], '01-2026', '04-2026');
    expect(rows.map(r => r.month)).toEqual(['01-2026', '02-2026', '03-2026', '04-2026']);
    expect(rows[0].deposits).toBe(0);
    expect(rows[1].deposits).toBe(100);
    expect(rows[3].gwRate).toBe(0);
  });

  it("flattens zinc's nested wire shape into the renderer row", () => {
    const rows = terminalZeroFill(
      [
        terminal({
          month: '01-2026',
          deposits: 500,
          paymentFees: 15,
          gwRate: 0.03,
          completed: { count: 4, collected: 400, ktmbCost: 100 },
          terminated: { count: 3, kept: 60, ktmbCostNet: 10, withExactRefund: 1 },
          withdrawals: { count: 2, gross: 80, feeIncome: 6, payoutFees: 2 },
        }),
      ],
      '01-2026',
      '01-2026',
    );
    expect(rows).toEqual([
      {
        month: '01-2026',
        deposits: 500,
        paymentFees: 15,
        gwRate: 0.03,
        completedCount: 4,
        collected: 400,
        ktmbCost: 100,
        terminatedCount: 3,
        kept: 60,
        ktmbCostNet: 10,
        withExactRefund: 1,
        withdrawalCount: 2,
        withdrawalGross: 80,
        feeIncome: 6,
        payoutFees: 2,
      },
    ]);
  });

  it('handles year boundaries correctly', () => {
    const rows = terminalZeroFill([terminal({ month: '01-2027', deposits: 50 })], '11-2026', '02-2027');
    expect(rows.map(r => r.month)).toEqual(['11-2026', '12-2026', '01-2027', '02-2027']);
    expect(rows[2].deposits).toBe(50);
  });

  it('falls back to a pass-through ascending sort when bounds are malformed', () => {
    const rows = terminalZeroFill([terminal({ month: '04-2026' }), terminal({ month: '02-2026' })], '', '');
    expect(rows.map(r => r.month)).toEqual(['02-2026', '04-2026']);
  });

  it('sorts the fallback across year boundaries by the numeric key', () => {
    const rows = terminalZeroFill([terminal({ month: '01-2026' }), terminal({ month: '11-2025' })], '', 'bogus');
    expect(rows.map(r => r.month)).toEqual(['11-2025', '01-2026']);
  });
});

describe('terminalTotals', () => {
  const rows = terminalZeroFill(
    [
      terminal({
        month: '01-2026',
        deposits: 1000,
        paymentFees: 30,
        gwRate: 0.03,
        completed: { count: 10, collected: 800, ktmbCost: 200 },
        terminated: { count: 2, kept: 100, ktmbCostNet: 20, withExactRefund: 1 },
        withdrawals: { count: 3, gross: 300, feeIncome: 30, payoutFees: 6 },
      }),
      terminal({
        month: '02-2026',
        deposits: 500,
        paymentFees: 25,
        gwRate: 0.05,
        completed: { count: 5, collected: 450, ktmbCost: 100 },
        terminated: { count: 1, kept: 50, ktmbCostNet: 10, withExactRefund: 1 },
        withdrawals: { count: 1, gross: 100, feeIncome: 10, payoutFees: 2 },
      }),
    ],
    '01-2026',
    '02-2026',
  );

  it('sums the raw columns', () => {
    const t = terminalTotals(rows);
    expect(t.deposits).toBe(1500);
    expect(t.paymentFees).toBe(55);
    expect(t.completedCount).toBe(15);
    expect(t.collected).toBe(1250);
    expect(t.ktmbCost).toBe(300);
    expect(t.terminatedCount).toBe(3);
    expect(t.kept).toBe(150);
    expect(t.ktmbCostNet).toBe(30);
    expect(t.withExactRefund).toBe(2);
    expect(t.withdrawalCount).toBe(4);
    expect(t.withdrawalGross).toBe(400);
    expect(t.feeIncome).toBe(40);
    expect(t.payoutFees).toBe(8);
  });

  it('sums the MONTHLY profit lines rather than re-running the formulas on a blended rate', () => {
    const t = terminalTotals(rows);
    // month 1: 800−200−0.03×800=576; month 2: 450−100−0.05×450=327.5
    expect(t.completedProfit).toBeCloseTo(903.5);
    // month 1: 100−20−0.03×100=77; month 2: 50−10−0.05×50=37.5
    expect(t.terminatedProfit).toBeCloseTo(114.5);
    // month 1: 30−0.03×300−6=15; month 2: 10−0.05×100−2=3
    expect(t.withdrawalProfit).toBeCloseTo(18);
    expect(t.ebitda).toBeCloseTo(903.5 + 114.5 + 18);
    // re-running the formula over the summed columns with the range-blended
    // rate recognizes the wrong fee share when monthly rates differ —
    // 1250 − 300 − (55/1500)×1250 ≈ 904.17 ≠ 903.5 — so assert the guard
    // actually matters
    const blended = t.collected - t.ktmbCost - t.gwRate * t.collected;
    expect(Math.abs(blended - t.completedProfit)).toBeGreaterThan(0.1);
  });

  it('blends the totals gwRate chip from summed fees over summed deposits', () => {
    expect(terminalTotals(rows).gwRate).toBeCloseTo(55 / 1500);
  });

  it('returns zeros (and a 0 rate) for empty input', () => {
    const t = terminalTotals([]);
    expect(t.deposits).toBe(0);
    expect(t.gwRate).toBe(0);
    expect(t.ebitda).toBe(0);
  });
});

describe('pnlCashNet', () => {
  it('subtracts NET payouts (gross − fee kept) and gateway fees from deposits', () => {
    // withdrawalTotal is the gross wallet debit; only Amount − Fee leaves the
    // bank — the fee stays with BunnyBooker, so cash out is the net payout.
    expect(
      pnlCashNet({
        month: '',
        deposits: 1000,
        withdrawalCount: 5,
        withdrawalTotal: 340,
        withdrawalFeeIncome: 40,
        gatewayFees: 12,
        ticketRevenue: 0,
        ktmbCost: 0,
      }),
    ).toBe(688);
  });

  it('negative when outflows + fees exceed deposits', () => {
    expect(
      pnlCashNet({
        month: '',
        deposits: 100,
        withdrawalCount: 2,
        withdrawalTotal: 200,
        withdrawalFeeIncome: 0,
        gatewayFees: 5,
        ticketRevenue: 0,
        ktmbCost: 0,
      }),
    ).toBe(-105);
  });

  it('does NOT credit earned revenue (deposits include ticket-payments)', () => {
    // A high-ticket-revenue month can have small deposits because customers
    // paid straight through; the cash view must NOT credit the cash position
    // with earned revenue — that double-counts and lives in the earned view.
    const net = pnlCashNet({
      month: '',
      deposits: 0,
      withdrawalCount: 0,
      withdrawalTotal: 0,
      withdrawalFeeIncome: 0,
      gatewayFees: 0,
      ticketRevenue: 9999,
      ktmbCost: 0,
    });
    expect(net).toBe(0);
  });
});

describe('pnlZeroFill', () => {
  it('inserts an all-zeros row for every calendar month in the range', () => {
    const rows = pnlZeroFill([pnl({ month: '02-2026', deposits: 100 })], '01-2026', '04-2026');
    expect(rows.map(r => r.month)).toEqual(['01-2026', '02-2026', '03-2026', '04-2026']);
    expect(rows[0].deposits).toBe(0);
    expect(rows[1].deposits).toBe(100);
    expect(rows[2].deposits).toBe(0);
    expect(rows[3].deposits).toBe(0);
  });

  it('keeps the payload verbatim when its months already cover the range', () => {
    const rows = pnlZeroFill([pnl({ month: '03-2026' }), pnl({ month: '01-2026' })], '01-2026', '03-2026');
    expect(rows.map(r => r.month)).toEqual(['01-2026', '02-2026', '03-2026']);
    expect(rows[1].deposits).toBe(0);
  });

  it('handles year boundaries correctly', () => {
    const rows = pnlZeroFill([pnl({ month: '01-2027', deposits: 50 })], '11-2026', '02-2027');
    expect(rows.map(r => r.month)).toEqual(['11-2026', '12-2026', '01-2027', '02-2027']);
    expect(rows[2].deposits).toBe(50);
  });

  it('falls back to a pass-through ascending sort when bounds are malformed', () => {
    // the picker can't produce a bad label, but defensiveness pays off when
    // zinc returns a single month and we ask it to fill a range it has no
    // way to know about (e.g. bounds are empty strings)
    const rows = pnlZeroFill([pnl({ month: '04-2026' }), pnl({ month: '02-2026' })], '', '');
    expect(rows.map(r => r.month)).toEqual(['02-2026', '04-2026']);
  });
});

describe('pnlTotals', () => {
  it('sums every column across the rows', () => {
    const total = pnlTotals([
      {
        month: '01-2026',
        deposits: 100,
        withdrawalCount: 1,
        withdrawalTotal: 20,
        withdrawalFeeIncome: 5,
        gatewayFees: 3,
        ticketRevenue: 200,
        ktmbCost: 50,
      },
      {
        month: '02-2026',
        deposits: 300,
        withdrawalCount: 2,
        withdrawalTotal: 60,
        withdrawalFeeIncome: 8,
        gatewayFees: 7,
        ticketRevenue: 400,
        ktmbCost: 90,
      },
    ]);
    expect(total.deposits).toBe(400);
    expect(total.withdrawalCount).toBe(3);
    expect(total.withdrawalTotal).toBe(80);
    expect(total.withdrawalFeeIncome).toBe(13);
    expect(total.gatewayFees).toBe(10);
    expect(total.ticketRevenue).toBe(600);
    expect(total.ktmbCost).toBe(140);
    // totals compose with the same formula; cash subtracts NET payouts:
    // 400 − (80 − 13) − 10 = 323
    expect(pnlCashNet(total)).toBe(323);
  });

  it('returns zeros for empty input', () => {
    expect(pnlTotals([])).toEqual({
      month: '',
      deposits: 0,
      withdrawalCount: 0,
      withdrawalTotal: 0,
      withdrawalFeeIncome: 0,
      gatewayFees: 0,
      ticketRevenue: 0,
      ktmbCost: 0,
    });
  });
});

describe('pickParam', () => {
  it('accepts only allowed values and falls back to ""', () => {
    expect(pickParam('cash', PNL_TABS)).toBe('cash');
    expect(pickParam('earned', PNL_TABS)).toBe('earned');
    expect(pickParam('bogus', PNL_TABS)).toBe('');
    expect(pickParam(null, PNL_TABS)).toBe('');
  });
});
