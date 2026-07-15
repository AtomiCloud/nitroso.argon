import { describe, expect, it } from 'vitest';
import type { TravelAnalysisBucketRes } from '$lib/api/core/data-contracts';
import { QUARTERS, cellCount, parseTravelDate, pivotTravelAnalysis, rowTotal } from './travel-stats';

function bucket(over: Partial<TravelAnalysisBucketRes>): TravelAnalysisBucketRes {
  return {
    date: '01-07-2026',
    direction: 'WToJ',
    quarterStartHour: 0,
    tickets: 1,
    ...over,
  };
}

describe('parseTravelDate', () => {
  it('parses zinc wire format', () => {
    const d = parseTravelDate('01-07-2026');
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2026);
    expect(d!.getUTCMonth()).toBe(6); // July (0-indexed)
    expect(d!.getUTCDate()).toBe(1);
  });

  it('returns null on garbage', () => {
    expect(parseTravelDate(null)).toBeNull();
    expect(parseTravelDate('')).toBeNull();
    expect(parseTravelDate('2026-07-01')).toBeNull(); // ISO is not wire format
    expect(parseTravelDate('garbage')).toBeNull();
    expect(parseTravelDate('1-7-2026')).toBeNull(); // not zero-padded
  });

  it('rejects impossible calendar dates by round-trip', () => {
    expect(parseTravelDate('31-02-2026')).toBeNull();
    expect(parseTravelDate('00-01-2026')).toBeNull();
    expect(parseTravelDate('32-01-2026')).toBeNull();
  });
});

describe('QUARTERS ladder', () => {
  it('is exactly 0/6/12/18 in order', () => {
    expect([...QUARTERS]).toEqual([0, 6, 12, 18]);
  });
});

describe('pivotTravelAnalysis', () => {
  it('returns an empty array for empty input', () => {
    expect(pivotTravelAnalysis([])).toEqual([]);
  });

  it('pivots non-empty buckets and sums the per-day total', () => {
    const rs = [
      bucket({ date: '01-07-2026', direction: 'WToJ', quarterStartHour: 0, tickets: 4 }),
      bucket({ date: '01-07-2026', direction: 'WToJ', quarterStartHour: 6, tickets: 3 }),
      bucket({ date: '01-07-2026', direction: 'JToW', quarterStartHour: 12, tickets: 2 }),
    ];
    const [row] = pivotTravelAnalysis(rs);
    expect(row.date).toBe('01-07-2026');
    expect(row.isoDate).toBe('2026-07-01');
    expect(row.total).toBe(9);
    expect(row.byDirection.WToJ[0]).toBe(4);
    expect(row.byDirection.WToJ[6]).toBe(3);
    expect(row.byDirection.JToW[12]).toBe(2);
    expect(row.byDirection.WToJ[12]).toBeUndefined();
  });

  it('emits rows in insertion order (zinc returns ascending travel dates)', () => {
    const rs = [
      bucket({ date: '03-07-2026', tickets: 1 }),
      bucket({ date: '01-07-2026', tickets: 1 }),
      bucket({ date: '02-07-2026', tickets: 1 }),
    ];
    const rows = pivotTravelAnalysis(rs);
    expect(rows.map(r => r.date)).toEqual(['03-07-2026', '01-07-2026', '02-07-2026']);
  });

  it('handles missing buckets by leaving them absent (renderer reads 0)', () => {
    const rs = [bucket({ quarterStartHour: 18, tickets: 5 })];
    const [row] = pivotTravelAnalysis(rs);
    expect(row.byDirection.WToJ[18]).toBe(5);
    expect(row.byDirection.WToJ[0]).toBeUndefined();
  });

  it('merges duplicate (date, direction, quarter) rows so cells stay in sync with the total', () => {
    // a duplicated bucket must not silently overwrite the cell while
    // double-counting row.total — the grid's Total column would no longer
    // equal the sum of its cells
    const rs = [bucket({ quarterStartHour: 6, tickets: 2 }), bucket({ quarterStartHour: 6, tickets: 3 })];
    const [row] = pivotTravelAnalysis(rs);
    expect(row.byDirection.WToJ[6]).toBe(5);
    expect(row.total).toBe(5);
  });
});

describe('cellCount', () => {
  const rows = pivotTravelAnalysis([
    bucket({ date: '01-07-2026', direction: 'WToJ', quarterStartHour: 0, tickets: 4 }),
    bucket({ date: '01-07-2026', direction: 'JToW', quarterStartHour: 12, tickets: 2 }),
  ]);
  const [row] = rows;

  it('returns the bucket count when present', () => {
    expect(cellCount(row, 'WToJ', 0)).toBe(4);
    expect(cellCount(row, 'JToW', 12)).toBe(2);
  });

  it('returns 0 for missing buckets, directions, or quarters', () => {
    expect(cellCount(row, 'WToJ', 12)).toBe(0);
    expect(cellCount(row, 'JToW', 0)).toBe(0);
    expect(cellCount(row, 'Other', 0)).toBe(0);
  });
});

describe('rowTotal', () => {
  const rows = pivotTravelAnalysis([
    bucket({ date: '01-07-2026', direction: 'WToJ', quarterStartHour: 0, tickets: 4 }),
    bucket({ date: '01-07-2026', direction: 'WToJ', quarterStartHour: 6, tickets: 3 }),
    bucket({ date: '01-07-2026', direction: 'JToW', quarterStartHour: 12, tickets: 2 }),
  ]);
  const [row] = rows;

  it('sums every quarter across both directions for the "all" filter', () => {
    expect(rowTotal(row, '')).toBe(9);
  });

  it('narrows to a single direction', () => {
    expect(rowTotal(row, 'WToJ')).toBe(7);
    expect(rowTotal(row, 'JToW')).toBe(2);
  });

  it('returns 0 for a direction the day has no rows for', () => {
    const empty = pivotTravelAnalysis([bucket({ direction: 'WToJ' })])[0];
    expect(rowTotal(empty, 'JToW')).toBe(0);
  });
});
