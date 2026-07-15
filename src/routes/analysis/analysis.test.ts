import { describe, expect, it } from 'vitest';
import type {
  BookingAnalysisProfitBucketRes,
  BookingAnalysisRowRes,
  BookingAnalysisSummaryRes,
  MonthlyAnalysisRes,
} from '$lib/api/core/data-contracts';
import {
  PROFIT_QUARTERS,
  boostView,
  cellCostIncomplete,
  cellNet,
  cellProfit,
  dateSortKey,
  dayProfitNet,
  daysPresent,
  groupByDay,
  monthNet,
  monthSortKey,
  netOf,
  pickParam,
  pivotProfitBuckets,
  rangeNet,
  sortMonthly,
  urlDayParam,
} from './analysis';

function row(over: Partial<BookingAnalysisRowRes>): BookingAnalysisRowRes {
  return {
    date: '01-07-2026',
    direction: 'WToJ',
    time: '08:00:00',
    ticketsCompleted: 1,
    grossRevenue: 30,
    ktmbCost: 5,
    ...over,
  };
}

describe('dateSortKey', () => {
  it('turns dd-MM-yyyy into a sortable yyyyMMdd key', () => {
    expect(dateSortKey('05-07-2026')).toBe('20260705');
    expect(dateSortKey('31-12-2025')).toBe('20251231');
  });

  it('orders across month/year boundaries correctly', () => {
    // plain string comparison of dd-MM-yyyy would get these wrong
    expect(dateSortKey('01-07-2026') > dateSortKey('30-06-2026')).toBe(true);
    expect(dateSortKey('01-01-2026') > dateSortKey('31-12-2025')).toBe(true);
  });

  it('returns "" for malformed dates', () => {
    expect(dateSortKey('2026-07-01')).toBe('');
    expect(dateSortKey('')).toBe('');
    expect(dateSortKey('garbage')).toBe('');
  });
});

describe('monthSortKey', () => {
  it('turns MM-yyyy into a sortable yyyyMM key', () => {
    expect(monthSortKey('07-2026')).toBe('202607');
    expect(monthSortKey('12-2025')).toBe('202512');
    expect(monthSortKey('01-2026') > monthSortKey('12-2025')).toBe(true);
  });

  it('returns "" for malformed months', () => {
    expect(monthSortKey('2026-07')).toBe('');
    expect(monthSortKey('')).toBe('');
  });
});

describe('groupByDay', () => {
  it('returns empty for no rows', () => {
    expect(groupByDay([])).toEqual([]);
  });

  it('groups rows by date with per-day totals including ktmb cost', () => {
    const groups = groupByDay([
      row({ date: '01-07-2026', time: '08:00:00', ticketsCompleted: 2, grossRevenue: 60, ktmbCost: 10 }),
      row({
        date: '01-07-2026',
        time: '17:00:00',
        direction: 'JToW',
        ticketsCompleted: 1,
        grossRevenue: 35,
        ktmbCost: 5,
      }),
      row({ date: '02-07-2026', time: '08:00:00', ticketsCompleted: 3, grossRevenue: 90, ktmbCost: 15 }),
    ]);

    expect(groups).toHaveLength(2);
    // newest day first
    expect(groups[0].date).toBe('02-07-2026');
    expect(groups[0].tickets).toBe(3);
    expect(groups[0].gross).toBe(90);
    expect(groups[0].ktmbCost).toBe(15);
    expect(groups[1].date).toBe('01-07-2026');
    expect(groups[1].tickets).toBe(3);
    expect(groups[1].gross).toBe(95);
    expect(groups[1].ktmbCost).toBe(15);
    expect(groups[1].slots).toHaveLength(2);
  });

  it('treats a missing ktmbCost (old zinc) as 0', () => {
    const groups = groupByDay([row({ ktmbCost: undefined })]);
    expect(groups[0].ktmbCost).toBe(0);
    expect(groups[0].slots[0].ktmbCost).toBe(0);
  });

  it('sorts days newest first across month boundaries', () => {
    const groups = groupByDay([row({ date: '30-06-2026' }), row({ date: '01-07-2026' }), row({ date: '15-06-2026' })]);
    expect(groups.map(g => g.date)).toEqual(['01-07-2026', '30-06-2026', '15-06-2026']);
  });

  it('sorts slots within a day by time then direction', () => {
    const groups = groupByDay([
      row({ time: '17:00:00', direction: 'WToJ' }),
      row({ time: '08:00:00', direction: 'WToJ' }),
      row({ time: '08:00:00', direction: 'JToW' }),
    ]);
    expect(groups[0].slots.map(s => `${s.time} ${s.direction}`)).toEqual([
      '08:00:00 JToW',
      '08:00:00 WToJ',
      '17:00:00 WToJ',
    ]);
  });

  it('merges duplicate (direction, time) rows within a day', () => {
    const groups = groupByDay([
      row({ ticketsCompleted: 2, grossRevenue: 60, ktmbCost: 10 }),
      row({ ticketsCompleted: 1, grossRevenue: 30, ktmbCost: 5 }),
    ]);
    expect(groups[0].slots).toHaveLength(1);
    expect(groups[0].slots[0].tickets).toBe(3);
    expect(groups[0].slots[0].gross).toBe(90);
    expect(groups[0].slots[0].ktmbCost).toBe(15);
  });
});

describe('daysPresent', () => {
  it('returns unique days newest first', () => {
    const days = daysPresent([
      row({ date: '30-06-2026' }),
      row({ date: '02-07-2026' }),
      row({ date: '30-06-2026', time: '17:00:00' }),
      row({ date: '01-07-2026' }),
    ]);
    expect(days).toEqual(['02-07-2026', '01-07-2026', '30-06-2026']);
  });

  it('returns empty for no rows', () => {
    expect(daysPresent([])).toEqual([]);
  });
});

function month(over: Partial<MonthlyAnalysisRes>): MonthlyAnalysisRes {
  return {
    month: '07-2026',
    gross: 1000,
    ktmbCost: 200,
    gatewayPaymentFees: 30,
    gatewayPayoutFees: 20,
    internalFees: 50,
    net: 750,
    byDirection: [],
    ...over,
  };
}

describe('monthly net math', () => {
  it('netOf = gross − ktmb − both gateway legs (internal fees NOT subtracted)', () => {
    expect(netOf(month({}))).toBe(750);
    expect(netOf(month({ gross: 100, ktmbCost: 0, gatewayPaymentFees: 0, gatewayPayoutFees: 0 }))).toBe(100);
    // a losing month goes negative
    expect(netOf(month({ gross: 100, ktmbCost: 90, gatewayPaymentFees: 10, gatewayPayoutFees: 5 }))).toBe(-5);
  });

  it('monthNet prefers zinc precomputed net over the client formula', () => {
    // deliberately inconsistent payload: zinc's net wins (authoritative decimals)
    expect(monthNet(month({ net: 749.99 }))).toBe(749.99);
  });

  it('monthNet falls back to the formula when net is absent (old zinc)', () => {
    expect(monthNet(month({ net: undefined as unknown as number }))).toBe(750);
  });

  it('sortMonthly orders newest month first across year boundaries', () => {
    const sorted = sortMonthly([month({ month: '12-2025' }), month({ month: '07-2026' }), month({ month: '01-2026' })]);
    expect(sorted.map(m => m.month)).toEqual(['07-2026', '01-2026', '12-2025']);
  });
});

describe('rangeNet', () => {
  function summary(over: Partial<BookingAnalysisSummaryRes>): BookingAnalysisSummaryRes {
    return {
      totalTickets: 10,
      totalGross: 500,
      totalKtmbCost: 100,
      deposits: { count: 0, captured: 0 },
      internalFees: { deposit: 0, withdrawal: 0, priority: 0, termination: 0 },
      gatewayFees: { payments: 20, payouts: 10, coverage: { paymentsWithFee: 5, paymentsTotal: 8 } },
      byDirection: [],
      ...over,
    };
  }

  it('subtracts ktmb cost and both gateway legs from gross', () => {
    expect(rangeNet(summary({}))).toBe(370);
  });

  it('degrades to plain gross on an old-zinc summary without the PR #39 fields', () => {
    expect(rangeNet(summary({ totalKtmbCost: undefined, gatewayFees: undefined }))).toBe(500);
  });
});

describe('boostView', () => {
  it('paid self-boost: no badges', () => {
    expect(boostView({ free: false, fee: 5, grantedBy: null })).toEqual({
      free: false,
      admin: false,
      targeted: false,
    });
  });

  it('free self-boost is "Free (targeted)"', () => {
    expect(boostView({ free: true, fee: null, grantedBy: null })).toEqual({
      free: true,
      admin: false,
      targeted: true,
    });
  });

  it('a null fee counts as free even without the flag (legacy rows)', () => {
    expect(boostView({ free: false, fee: null, grantedBy: null }).free).toBe(true);
  });

  it('admin-granted boost gets the admin badge, not "targeted"', () => {
    const v = boostView({ free: true, fee: null, grantedBy: 'admin-sub-123' });
    expect(v.admin).toBe(true);
    expect(v.free).toBe(true);
    expect(v.targeted).toBe(false);
  });

  it('an admin-granted PAID boost is admin but not free', () => {
    const v = boostView({ free: false, fee: 10, grantedBy: 'admin-sub-123' });
    expect(v).toEqual({ free: false, admin: true, targeted: false });
  });

  it('an empty grantedBy string is not an admin grant', () => {
    expect(boostView({ free: false, fee: 5, grantedBy: '' }).admin).toBe(false);
  });
});

describe('URL param helpers', () => {
  it('pickParam accepts only allowed values', () => {
    expect(pickParam('monthly', ['overview', 'monthly'])).toBe('monthly');
    expect(pickParam('garbage', ['overview', 'monthly'])).toBe('');
    expect(pickParam(null, ['overview'])).toBe('');
  });

  it('urlDayParam accepts a real dd-MM-yyyy day', () => {
    expect(urlDayParam('05-07-2026')).toBe('05-07-2026');
    expect(urlDayParam('29-02-2024')).toBe('29-02-2024');
  });

  it('urlDayParam rejects malformed or impossible dates', () => {
    expect(urlDayParam(null)).toBe('');
    expect(urlDayParam('2026-07-05')).toBe('');
    expect(urlDayParam('31-02-2026')).toBe('');
    expect(urlDayParam('29-02-2026')).toBe('');
    expect(urlDayParam('00-07-2026')).toBe('');
    expect(urlDayParam('garbage')).toBe('');
  });
});

function profit(over: Partial<BookingAnalysisProfitBucketRes>): BookingAnalysisProfitBucketRes {
  return {
    date: '01-07-2026',
    quarterStartHour: 0,
    tickets: 2,
    revenue: 60,
    cost: 10,
    withActualCost: 2,
    ...over,
  };
}

describe('PROFIT_QUARTERS ladder', () => {
  it('is exactly 0/6/12/18 in order', () => {
    expect([...PROFIT_QUARTERS]).toEqual([0, 6, 12, 18]);
  });
});

describe('pivotProfitBuckets', () => {
  it('returns empty for no input', () => {
    expect(pivotProfitBuckets([])).toEqual([]);
  });

  it('places each (date, quarter) bucket into its own cell, summing day totals', () => {
    // zinc returns one row per (date, quarter) with both directions already
    // merged on its side; the pivot maps each bucket to its cell and sums
    // every bucket on the day into the day totals
    const rs = [
      profit({ quarterStartHour: 0, tickets: 2, revenue: 60, cost: 10, withActualCost: 2 }),
      profit({ quarterStartHour: 6, tickets: 3, revenue: 90, cost: 15, withActualCost: 3 }),
      profit({ quarterStartHour: 12, tickets: 1, revenue: 30, cost: 5, withActualCost: 1 }),
    ];
    const rows = pivotProfitBuckets(rs);
    expect(rows).toHaveLength(1);
    expect(rows[0].tickets).toBe(6);
    expect(rows[0].revenue).toBe(180);
    expect(rows[0].cost).toBe(30);
    expect(rows[0].withActualCost).toBe(6);
    expect(rows[0].cells[0].tickets).toBe(2);
    expect(rows[0].cells[6].tickets).toBe(3);
    expect(rows[0].cells[12].tickets).toBe(1);
    // absent buckets are NOT stored on the row — cellProfit() zero-fills
    expect(rows[0].cells[18]).toBeUndefined();
  });

  it('keeps one row per travel date in zinc insertion order', () => {
    const rs = [profit({ date: '02-07-2026', tickets: 1 }), profit({ date: '01-07-2026', tickets: 1 })];
    const rows = pivotProfitBuckets(rs);
    expect(rows.map(r => r.date)).toEqual(['02-07-2026', '01-07-2026']);
  });
});

describe('cellProfit', () => {
  const [row] = pivotProfitBuckets([
    profit({ quarterStartHour: 0, tickets: 2, revenue: 60, cost: 10, withActualCost: 1 }),
  ]);

  it('returns the present bucket verbatim', () => {
    expect(cellProfit(row, 0).tickets).toBe(2);
    expect(cellProfit(row, 0).revenue).toBe(60);
    expect(cellProfit(row, 0).cost).toBe(10);
    expect(cellProfit(row, 0).withActualCost).toBe(1);
  });

  it('zero-fills absent buckets so the renderer can read straight from the pivot', () => {
    const c = cellProfit(row, 6);
    expect(c.tickets).toBe(0);
    expect(c.revenue).toBe(0);
    expect(c.cost).toBe(0);
    expect(c.withActualCost).toBe(0);
    expect(c.quarterStartHour).toBe(6);
  });
});

describe('cellNet & dayProfitNet', () => {
  it('net = revenue − cost (negative when the day costs more than it earns)', () => {
    const winning = cellProfit(
      {
        date: '01-07-2026',
        cells: { 0: { quarterStartHour: 0, tickets: 2, revenue: 60, cost: 10, withActualCost: 2 } },
        tickets: 2,
        revenue: 60,
        cost: 10,
        withActualCost: 2,
      },
      0,
    );
    expect(cellNet(winning)).toBe(50);
    const losing = cellProfit(
      {
        date: '01-07-2026',
        cells: { 0: { quarterStartHour: 0, tickets: 2, revenue: 10, cost: 30, withActualCost: 2 } },
        tickets: 2,
        revenue: 10,
        cost: 30,
        withActualCost: 2,
      },
      0,
    );
    expect(cellNet(losing)).toBe(-20);
    expect(dayProfitNet({ date: '01-07-2026', cells: {}, tickets: 4, revenue: 70, cost: 40, withActualCost: 4 })).toBe(
      30,
    );
  });
});

describe('cellCostIncomplete', () => {
  it('flags a cell whose actual-cost coverage is partial', () => {
    expect(cellCostIncomplete({ quarterStartHour: 0, tickets: 4, revenue: 120, cost: 30, withActualCost: 3 })).toBe(
      true,
    );
    expect(cellCostIncomplete({ quarterStartHour: 0, tickets: 4, revenue: 120, cost: 30, withActualCost: 4 })).toBe(
      false,
    );
    expect(cellCostIncomplete({ quarterStartHour: 0, tickets: 0, revenue: 0, cost: 0, withActualCost: 0 })).toBe(false);
  });
});
