import { describe, expect, it } from 'vitest';
import type { BookingTerminalPnlRowRes } from '$lib/api/core/data-contracts';
import {
  blendedLossPct,
  monthRange,
  monthSortKey,
  pnlWithdrawalBreakdown,
  terminalTotals,
  terminalZeroFill,
  toTerminalPnlRow,
  withdrawalLossAmount,
  withdrawalProfit,
  withdrawalTotals,
} from './terminal';

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

describe('withdrawalLossAmount', () => {
  it('is gwRate×gross + payoutFees − feeIncome (positive = loss)', () => {
    // 0.03×340 + 8 − 40 = 10.2 + 8 − 40 = −21.8 (a gain — fee income won)
    expect(withdrawalLossAmount({ feeIncome: 40, withdrawalGross: 340, gwRate: 0.03, payoutFees: 8 })).toBeCloseTo(
      -21.8,
    );
  });

  it('positive when channel costs exceed the 4% fee income', () => {
    expect(withdrawalLossAmount({ feeIncome: 1, withdrawalGross: 500, gwRate: 0.03, payoutFees: 5 })).toBeCloseTo(19);
  });

  it('is the negation of withdrawalProfit (definitionally)', () => {
    const r = { feeIncome: 40, withdrawalGross: 340, gwRate: 0.03, payoutFees: 8 };
    expect(withdrawalLossAmount(r)).toBeCloseTo(-withdrawalProfit(r));
  });

  it('zero on an all-zeros row', () => {
    expect(withdrawalLossAmount({ feeIncome: 0, withdrawalGross: 0, gwRate: 0, payoutFees: 0 })).toBe(0);
  });
});

describe('blendedLossPct', () => {
  it('is net loss per withdrawn dollar as a fraction', () => {
    // (−21.8) / 340 ≈ −0.0641 — fee income exceeds costs, so per-dollar is
    // a small gain (negative loss)
    expect(blendedLossPct({ feeIncome: 40, withdrawalGross: 340, gwRate: 0.03, payoutFees: 8 })).toBeCloseTo(
      -21.8 / 340,
    );
  });

  it('returns null when no gross was paid out (avoids NaN%)', () => {
    expect(blendedLossPct({ feeIncome: 0, withdrawalGross: 0, gwRate: 0.03, payoutFees: 0 })).toBeNull();
    expect(blendedLossPct({ feeIncome: 5, withdrawalGross: 0, gwRate: 0.03, payoutFees: 2 })).toBeNull();
  });

  it('positive when channel costs exceed fee income (real loss per dollar)', () => {
    // 19 / 500 = 0.038 → 3.8% of every paid-out dollar is lost
    expect(blendedLossPct({ feeIncome: 1, withdrawalGross: 500, gwRate: 0.03, payoutFees: 5 })).toBeCloseTo(19 / 500);
  });
});

describe('withdrawalTotals', () => {
  it('sums raw columns and re-derives netLoss + blendedLossPct on the totals', () => {
    const rows = terminalZeroFill(
      [
        terminal({
          month: '01-2026',
          deposits: 1000,
          paymentFees: 30,
          gwRate: 0.03,
          withdrawals: { count: 3, gross: 300, feeIncome: 30, payoutFees: 6 },
        }),
        terminal({
          month: '02-2026',
          deposits: 500,
          paymentFees: 25,
          gwRate: 0.05,
          withdrawals: { count: 1, gross: 100, feeIncome: 10, payoutFees: 2 },
        }),
      ],
      '01-2026',
      '02-2026',
    );
    const t = withdrawalTotals(rows);
    expect(t.count).toBe(4);
    expect(t.gross).toBe(400);
    expect(t.feeIncome).toBe(40);
    // depositFee = 0.03×300 + 0.05×100 = 9 + 5 = 14 (each month keeps its own
    // gwRate — we cannot pre-blend)
    expect(t.depositFee).toBeCloseTo(14);
    expect(t.payoutFees).toBe(8);
    // netLoss = 14 + 8 − 40 = −18 (a gain on the range)
    expect(t.netLoss).toBeCloseTo(-18);
    // blended on the SUM: −18 / 400 = −0.045
    expect(t.blendedLossPct).toBeCloseTo(-18 / 400);
  });

  it('blendedLossPct is null when the whole range had zero gross', () => {
    const t = withdrawalTotals([
      toTerminalPnlRow(terminal({ month: '01-2026' })),
      toTerminalPnlRow(terminal({ month: '02-2026' })),
    ]);
    expect(t.gross).toBe(0);
    expect(t.netLoss).toBe(0);
    expect(t.blendedLossPct).toBeNull();
  });
});

describe('monthSortKey / monthRange (smoke tests after extraction)', () => {
  it('monthSortKey still works for the shared module callers', () => {
    expect(monthSortKey('07-2026')).toBe('202607');
    expect(monthSortKey('13-2026')).toBe('');
  });

  it('monthRange is exported and usable from outside the file', () => {
    expect(monthRange('01-2026', '03-2026')).toEqual(['01-2026', '02-2026', '03-2026']);
    expect(monthRange('bogus', '03-2026')).toEqual([]);
  });
});

// Sanity: re-exporting terminalTotals keeps /pnl compatible
describe('terminalTotals re-export', () => {
  it('is the same shape pnl.ts used before the extraction', () => {
    const rows = terminalZeroFill(
      [
        terminal({
          month: '01-2026',
          deposits: 1000,
          paymentFees: 30,
          gwRate: 0.03,
          completed: { count: 10, collected: 800, ktmbCost: 200 },
        }),
      ],
      '01-2026',
      '01-2026',
    );
    const t = terminalTotals(rows);
    expect(t.completedProfit).toBeCloseTo(800 - 200 - 0.03 * 800);
  });
});

// Sanity: pnlWithdrawalBreakdown still works through the shared module
describe('pnlWithdrawalBreakdown re-export', () => {
  it('returns the three components unchanged', () => {
    expect(pnlWithdrawalBreakdown({ feeIncome: 40, withdrawalGross: 340, gwRate: 0.03, payoutFees: 8 })).toEqual({
      feeIncome: 40,
      depositFee: 10.2,
      payoutFees: 8,
    });
  });
});
