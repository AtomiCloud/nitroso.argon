import { describe, expect, it } from 'vitest';
import type { UserPartnerPnlRowRes } from '$lib/api/core/data-contracts';
import {
  monthSortKey,
  partnerMargin,
  partnerMarginPct,
  partnerPnlTotals,
  partnerPnlZeroFill,
  toPartnerPnlRow,
} from './partners';

function row(over: Partial<UserPartnerPnlRowRes>): UserPartnerPnlRowRes {
  return {
    month: '07-2026',
    bookings: 0,
    collected: 0,
    ktmbCost: 0,
    deposits: 0,
    withdrawalGross: 0,
    withdrawalFeeIncome: 0,
    boostCount: 0,
    boostAmount: 0,
    ...over,
  };
}

describe('monthSortKey', () => {
  it('turns MM-yyyy into a sortable yyyyMM key', () => {
    expect(monthSortKey('07-2026')).toBe('202607');
    expect(monthSortKey('12-2025')).toBe('202512');
    expect(monthSortKey('01-2026') > monthSortKey('12-2025')).toBe(true);
  });

  it('returns "" for malformed months', () => {
    expect(monthSortKey('2026-07')).toBe('');
    expect(monthSortKey('')).toBe('');
    expect(monthSortKey('garbage')).toBe('');
  });

  it('rejects out-of-range months (defensive: 13-2026 must not produce a sort key)', () => {
    // structurally matches the regex but is semantically wrong — would
    // otherwise produce a nonsense key and let partnerPnlZeroFill's cursor
    // math loop forever on the from-key comparison
    expect(monthSortKey('13-2026')).toBe('');
    expect(monthSortKey('00-2026')).toBe('');
    expect(monthSortKey('99-2026')).toBe('');
  });
});

describe('partnerMargin', () => {
  it('is collected − ktmbCost', () => {
    expect(partnerMargin(row({ collected: 1000, ktmbCost: 200 }))).toBe(800);
    expect(partnerMargin(row({ collected: 100, ktmbCost: 0 }))).toBe(100);
    expect(partnerMargin(row({ collected: 0, ktmbCost: 0 }))).toBe(0);
  });

  it('is negative when ktmb cost exceeds collected (rare: partner undercut us)', () => {
    expect(partnerMargin(row({ collected: 50, ktmbCost: 80 }))).toBe(-30);
  });
});

describe('partnerMarginPct', () => {
  it('is margin / collected', () => {
    expect(partnerMarginPct(row({ collected: 1000, ktmbCost: 200 }))).toBe(0.8);
    expect(partnerMarginPct(row({ collected: 100, ktmbCost: 50 }))).toBe(0.5);
    // exactly 100% margin
    expect(partnerMarginPct(row({ collected: 100, ktmbCost: 0 }))).toBe(1);
    // exactly 0% margin
    expect(partnerMarginPct(row({ collected: 100, ktmbCost: 100 }))).toBe(0);
  });

  it('guards divide-by-zero: returns 0 when collected is 0', () => {
    // the partner had no bookings — no revenue, no margin percentage
    // (NaN would render as "NaN%" — useless and alarming)
    expect(partnerMarginPct(row({ collected: 0, ktmbCost: 0 }))).toBe(0);
    expect(partnerMarginPct(row({ collected: 0, ktmbCost: 50 }))).toBe(0);
  });

  it('returns a negative percentage when ktmb cost exceeds collected', () => {
    expect(partnerMarginPct(row({ collected: 50, ktmbCost: 80 }))).toBeCloseTo(-0.6, 5);
  });
});

describe('toPartnerPnlRow', () => {
  it('shapes zinc payload into the UI row with margin + marginPct derived', () => {
    const r = toPartnerPnlRow(
      row({
        month: '07-2026',
        bookings: 12,
        collected: 1000,
        ktmbCost: 200,
        deposits: 500,
        withdrawalGross: 100,
        withdrawalFeeIncome: 10,
      }),
    );
    expect(r.month).toBe('07-2026');
    expect(r.bookings).toBe(12);
    expect(r.collected).toBe(1000);
    expect(r.ktmbCost).toBe(200);
    expect(r.margin).toBe(800);
    expect(r.marginPct).toBe(0.8);
    expect(r.deposits).toBe(500);
    expect(r.withdrawalGross).toBe(100);
    expect(r.withdrawalFeeIncome).toBe(10);
    // boostCount / boostAmount are additive (zinc PR #54) — passed through
    // verbatim, since they're already shape-correct numbers
    expect(r.boostCount).toBe(0);
    expect(r.boostAmount).toBe(0);
  });

  it('passes boostCount + boostAmount through unchanged', () => {
    // a booking with a consumed priority boost contributes 1 to boostCount
    // and its fee to boostAmount — the helper only re-shapes, never derives
    const r = toPartnerPnlRow(
      row({
        month: '08-2026',
        bookings: 5,
        boostCount: 3,
        boostAmount: 45,
      }),
    );
    expect(r.boostCount).toBe(3);
    expect(r.boostAmount).toBe(45);
  });
});

describe('partnerPnlZeroFill', () => {
  it('inserts an all-zeros row for every calendar month in the range', () => {
    // zinc only returns months with activity; the page reads better as
    // a continuous series, so the renderer wants one row per month.
    const rows = partnerPnlZeroFill([row({ month: '02-2026', collected: 100 })], '01-2026', '04-2026');
    expect(rows.map(r => r.month)).toEqual(['01-2026', '02-2026', '03-2026', '04-2026']);
    expect(rows[0].collected).toBe(0);
    expect(rows[1].collected).toBe(100);
    expect(rows[2].collected).toBe(0);
    expect(rows[3].collected).toBe(0);
    // zero rows also carry zero margin + zero marginPct (no divide-by-zero)
    expect(rows[0].margin).toBe(0);
    expect(rows[0].marginPct).toBe(0);
  });

  it('keeps the payload verbatim when its months already cover the range', () => {
    const rows = partnerPnlZeroFill([row({ month: '03-2026' }), row({ month: '01-2026' })], '01-2026', '03-2026');
    expect(rows.map(r => r.month)).toEqual(['01-2026', '02-2026', '03-2026']);
    expect(rows[1].collected).toBe(0);
  });

  it('handles year boundaries correctly', () => {
    const rows = partnerPnlZeroFill([row({ month: '01-2027', collected: 50 })], '11-2026', '02-2027');
    expect(rows.map(r => r.month)).toEqual(['11-2026', '12-2026', '01-2027', '02-2027']);
    expect(rows[2].collected).toBe(50);
  });

  it('falls back to a pass-through ascending sort when bounds are malformed', () => {
    // defensive: a malformed URL or an empty range should still yield a
    // usable table from whatever zinc returned
    const rows = partnerPnlZeroFill([row({ month: '04-2026' }), row({ month: '02-2026' })], '', '');
    expect(rows.map(r => r.month)).toEqual(['02-2026', '04-2026']);
  });

  it('fallback sort orders correctly across year boundaries', () => {
    // localeCompare on "MM-yyyy" happens to give the right order for
    // 12-2025 < 01-2026 (12 < 01 in the first two chars, "12-2025" < "01-2026"
    // is true lexicographically), but it's accidental and brittle — the
    // sort must use the numeric yyyyMM key, which is the only correct way
    const rows = partnerPnlZeroFill(
      [row({ month: '01-2026' }), row({ month: '11-2025' }), row({ month: '02-2026' })],
      '',
      '',
    );
    expect(rows.map(r => r.month)).toEqual(['11-2025', '01-2026', '02-2026']);
  });

  it('zero-fills boostCount + boostAmount together with the rest', () => {
    // a partner boosted 4 of 10 July bookings (40 MYR in boost fees).
    // The other months in the range had no boosted bookings at all —
    // their zero rows must carry zero boost fields, not undefined.
    const rows = partnerPnlZeroFill(
      [row({ month: '07-2026', bookings: 10, boostCount: 4, boostAmount: 40 })],
      '06-2026',
      '08-2026',
    );
    expect(rows.map(r => ({ m: r.month, b: r.boostCount, a: r.boostAmount }))).toEqual([
      { m: '06-2026', b: 0, a: 0 },
      { m: '07-2026', b: 4, a: 40 },
      { m: '08-2026', b: 0, a: 0 },
    ]);
  });
});

describe('partnerPnlTotals', () => {
  it('sums every column across the rows', () => {
    const total = partnerPnlTotals([
      {
        month: '01-2026',
        bookings: 5,
        boostCount: 2,
        boostAmount: 30,
        collected: 1000,
        ktmbCost: 200,
        margin: 800,
        marginPct: 0.8,
        deposits: 500,
        withdrawalGross: 100,
        withdrawalFeeIncome: 10,
      },
      {
        month: '02-2026',
        bookings: 3,
        boostCount: 1,
        boostAmount: 15,
        collected: 400,
        ktmbCost: 100,
        margin: 300,
        marginPct: 0.75,
        deposits: 200,
        withdrawalGross: 50,
        withdrawalFeeIncome: 5,
      },
    ]);
    expect(total.bookings).toBe(8);
    expect(total.boostCount).toBe(3);
    expect(total.boostAmount).toBe(45);
    expect(total.collected).toBe(1400);
    expect(total.ktmbCost).toBe(300);
    expect(total.margin).toBe(1100);
    // weighted-average margin %, not the average of monthly percentages
    // (sum margin / sum collected = 1100 / 1400 ≈ 0.7857)
    expect(total.marginPct).toBeCloseTo(1100 / 1400, 5);
    expect(total.deposits).toBe(700);
    expect(total.withdrawalGross).toBe(150);
    expect(total.withdrawalFeeIncome).toBe(15);
  });

  it('returns zeros for empty input', () => {
    expect(partnerPnlTotals([])).toEqual({
      month: '',
      bookings: 0,
      boostCount: 0,
      boostAmount: 0,
      collected: 0,
      ktmbCost: 0,
      margin: 0,
      marginPct: 0,
      deposits: 0,
      withdrawalGross: 0,
      withdrawalFeeIncome: 0,
    });
  });

  it('marginPct falls back to 0 when summed collected is 0', () => {
    // zero-revenue months: the weighted-average ratio would NaN without
    // the guard, so the totals row stays at 0% instead
    const total = partnerPnlTotals([
      {
        month: '01-2026',
        bookings: 0,
        boostCount: 0,
        boostAmount: 0,
        collected: 0,
        ktmbCost: 0,
        margin: 0,
        marginPct: 0,
        deposits: 0,
        withdrawalGross: 0,
        withdrawalFeeIncome: 0,
      },
      {
        month: '02-2026',
        bookings: 0,
        boostCount: 0,
        boostAmount: 0,
        collected: 0,
        ktmbCost: 0,
        margin: 0,
        marginPct: 0,
        deposits: 0,
        withdrawalGross: 0,
        withdrawalFeeIncome: 0,
      },
    ]);
    expect(total.marginPct).toBe(0);
    expect(total.collected).toBe(0);
  });
});
