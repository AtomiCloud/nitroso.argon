import { describe, expect, it } from 'vitest';
import type { BookingStatRes } from '$lib/api/core/data-contracts';
import {
  DAYS,
  DELIVERY_BUCKETS,
  DEMAND_BUCKETS,
  DIRECTIONS,
  LEAD_BUCKETS,
  aggregate,
  bucketMatches,
  buildMatrixMetrics,
  completedWithDelivery,
  deliveryMetricRows,
  filterStatsRows,
  formatZincDate,
  leadBucketMatches,
  matrixMetricKey,
  parseZincDate,
  priorityMatches,
  singaporeToday,
  successMetric,
  successMetricRows,
  toStatRow,
} from './stats';

function stat(overrides: Partial<BookingStatRes> = {}): BookingStatRes {
  return {
    dayOfWeek: 'Monday',
    time: '08:00:00',
    direction: 'WToJ',
    bucket: '6h',
    priority: false,
    demandBucket: '0-5',
    deliveryBucket: null,
    total: 1,
    completed: 0,
    refunded: 0,
    cancelled: 0,
    terminated: 0,
    other: 1,
    ...overrides,
  };
}

describe('canonical Zinc dimensions', () => {
  it('pins every display and cumulative bucket order', () => {
    expect(DAYS).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    expect(DIRECTIONS).toEqual(['WToJ', 'JToW']);
    expect(LEAD_BUCKETS).toEqual([
      '6h',
      '12h',
      '24h',
      '2d',
      '3d',
      '4d',
      '1w',
      '2w',
      '3w',
      '4w',
      '1m',
      '2m',
      '3m',
      '6m',
      '6m+',
    ]);
    expect(DEMAND_BUCKETS).toEqual(['0-5', '5-10', '10-20', '20-30', '30+']);
    expect(DELIVERY_BUCKETS).toEqual(['1h', '2h', '3h', '4h', '5h', '6h', '12h', '24h', '48h', '48h+']);
  });

  it('matches per, inclusive ≤, and strict > using semantic order', () => {
    expect(leadBucketMatches('24h', '24h', 'per')).toBe(true);
    expect(leadBucketMatches('12h', '24h', 'per')).toBe(false);

    expect(leadBucketMatches('6h', '24h', 'le')).toBe(true);
    expect(leadBucketMatches('24h', '24h', 'le')).toBe(true);
    expect(leadBucketMatches('2d', '24h', 'le')).toBe(false);

    expect(leadBucketMatches('2d', '24h', 'ge')).toBe(true);
    expect(leadBucketMatches('24h', '24h', 'ge')).toBe(false);
    expect(leadBucketMatches('12h', '24h', 'ge')).toBe(false);
    expect(leadBucketMatches('6m+', '6m+', 'ge')).toBe(true);

    expect(bucketMatches('not-a-bucket', '24h', LEAD_BUCKETS, 'le')).toBe(false);
    expect(bucketMatches(null, '24h', LEAD_BUCKETS, 'le')).toBe(false);
    expect(bucketMatches('24h', undefined, LEAD_BUCKETS, 'le')).toBe(false);
  });
});

describe('outcome aggregation and success metrics', () => {
  it('aggregates every Zinc outcome field', () => {
    const result = aggregate([
      stat({ total: 10, completed: 5, refunded: 2, cancelled: 1, terminated: 1, other: 1 }),
      stat({ total: 7, completed: 3, refunded: 1, cancelled: 1, terminated: 1, other: 1 }),
    ]);

    expect(result).toEqual({
      total: 17,
      completed: 8,
      refunded: 3,
      cancelled: 2,
      terminated: 2,
      other: 2,
    });
  });

  it('keeps the two product success definitions and raw numerator/denominator', () => {
    const totals = aggregate([stat({ total: 13, completed: 8, refunded: 2, cancelled: 2, terminated: 1, other: 0 })]);

    expect(successMetric(totals, 'refund')).toEqual({
      numerator: 8,
      denominator: 10,
      rate: 80,
    });
    const refundAndCancel = successMetric(totals, 'refundCancel');
    expect(refundAndCancel.numerator).toBe(8);
    expect(refundAndCancel.denominator).toBe(12);
    expect(refundAndCancel.rate).toBeCloseTo(66.6667, 3);

    const tableRow = toStatRow('all', 'All', '', [stat({ total: 10, completed: 8, refunded: 2 })], 'refund');
    expect(tableRow).toMatchObject({ total: 10, num: 8, den: 10, rate: 80 });

    const rows = successMetricRows(
      [{ key: 'all', label: 'All', direction: 'WToJ', rows: [stat({ completed: 1, refunded: 1 })] }],
      'refund',
    );
    expect(rows[0]).toMatchObject({ key: 'all', dir: 'WToJ', num: 1, den: 2, rate: 50 });
  });
});

describe('global filtering', () => {
  const rows = [
    stat({ dayOfWeek: 'Monday', direction: 'WToJ', time: '08:00:00', bucket: '6h', priority: true }),
    stat({ dayOfWeek: 'Monday', direction: 'WToJ', time: '08:00:00', bucket: '24h', priority: false }),
    stat({ dayOfWeek: 'Tuesday', direction: 'WToJ', time: '08:00:00', bucket: '12h', priority: false }),
    stat({ dayOfWeek: 'Monday', direction: 'JToW', time: '08:00:00', bucket: '12h', priority: false }),
  ];

  it('supports all, priority-only, and regular-only modes without guessing malformed values', () => {
    expect(priorityMatches(true, 'all')).toBe(true);
    expect(priorityMatches(undefined, 'all')).toBe(true);
    expect(priorityMatches(true, 'priority')).toBe(true);
    expect(priorityMatches(false, 'priority')).toBe(false);
    expect(priorityMatches(false, 'regular')).toBe(true);
    expect(priorityMatches(undefined, 'regular')).toBe(false);
  });

  it('combines day, direction, time, cumulative lead, and priority filters', () => {
    expect(
      filterStatsRows(rows, {
        day: 'Monday',
        direction: 'WToJ',
        time: '08:00:00',
        leadBucket: '12h',
        leadMode: 'le',
        priority: 'priority',
      }),
    ).toEqual([rows[0]]);

    expect(
      filterStatsRows(rows, {
        day: 'Monday',
        direction: 'WToJ',
        leadBucket: '12h',
        leadMode: 'ge',
        priority: 'regular',
      }),
    ).toEqual([rows[1]]);
    expect(filterStatsRows(rows)).toEqual(rows);
  });
});

describe('delivery distribution', () => {
  const rows = [
    stat({ deliveryBucket: '48h', completed: 4, total: 4, other: 0 }),
    stat({ deliveryBucket: null, completed: 100, total: 100, other: 0 }),
    stat({ deliveryBucket: '1h', completed: 2, total: 2, other: 0 }),
    stat({ deliveryBucket: '2h', completed: 3, total: 3, other: 0 }),
    stat({ deliveryBucket: 'unknown', completed: 50, total: 50, other: 0 }),
  ];

  it('excludes null and unknown buckets from both numerator and denominator', () => {
    expect(completedWithDelivery(rows)).toBe(9);
    const metrics = deliveryMetricRows(rows, 'per');
    expect(metrics).toHaveLength(DELIVERY_BUCKETS.length);
    expect(metrics.find(row => row.key === '1h')).toMatchObject({ completed: 2, numerator: 2, denominator: 9 });
    expect(metrics.find(row => row.key === '2h')).toMatchObject({ completed: 3, numerator: 3, denominator: 9 });
    expect(metrics.find(row => row.key === '3h')).toMatchObject({ completed: 0, numerator: 0, denominator: 9 });
    expect(metrics.find(row => row.key === '48h')).toMatchObject({ completed: 4, numerator: 4, denominator: 9 });
  });

  it('uses the same fixed denominator for cumulative ≤ and ≥ rows', () => {
    const atMost = deliveryMetricRows(rows, 'le');
    expect(atMost.find(row => row.key === '1h')).toMatchObject({ numerator: 2, denominator: 9 });
    expect(atMost.find(row => row.key === '2h')).toMatchObject({ numerator: 5, denominator: 9 });
    expect(atMost.find(row => row.key === '48h')).toMatchObject({ numerator: 9, denominator: 9 });

    const atLeast = deliveryMetricRows(rows, 'ge');
    expect(atLeast.find(row => row.key === '1h')).toMatchObject({ numerator: 7, denominator: 9 });
    expect(atLeast.find(row => row.key === '2h')).toMatchObject({ numerator: 4, denominator: 9 });
    expect(atLeast.find(row => row.key === '48h')).toMatchObject({ numerator: 0, denominator: 9 });
  });
});

describe('direction-safe day × time matrix', () => {
  it('never merges identical departure times across directions', () => {
    const rows = [
      stat({ direction: 'WToJ', completed: 3, refunded: 1, total: 4, other: 0 }),
      stat({ direction: 'WToJ', completed: 1, total: 1, other: 0 }),
      stat({ direction: 'JToW', completed: 2, cancelled: 1, total: 3, other: 0 }),
    ];
    const matrix = buildMatrixMetrics(rows, 'refundCancel');

    expect(matrix.size).toBe(2);
    expect(matrixMetricKey('WToJ', '08:00:00', 'Monday')).toBe('WToJ|08:00:00|Monday');
    expect(matrix.get('WToJ|08:00:00|Monday')).toMatchObject({
      numerator: 4,
      denominator: 5,
      rate: 80,
      total: 5,
    });
    expect(matrix.get('JToW|08:00:00|Monday')).toMatchObject({
      numerator: 2,
      denominator: 3,
      total: 3,
    });
  });

  it('skips missing or malformed matrix dimensions', () => {
    const malformed = [
      stat({ direction: null }),
      stat({ direction: 'Sideways' }),
      stat({ time: null }),
      stat({ time: '8am' }),
      stat({ dayOfWeek: null }),
      stat({ dayOfWeek: 'Funday' }),
    ];
    expect(buildMatrixMetrics(malformed, 'refund').size).toBe(0);
    expect(matrixMetricKey(undefined, '08:00:00', 'Monday')).toBeNull();
  });
});

describe('malformed and empty data', () => {
  it('turns invalid counts into zero instead of leaking NaN or negatives', () => {
    const malformed = {
      ...stat(),
      total: undefined,
      completed: Number.NaN,
      refunded: -1,
      cancelled: Number.POSITIVE_INFINITY,
      terminated: null,
      other: 2,
    } as unknown as BookingStatRes;

    expect(aggregate([malformed])).toEqual({
      total: 0,
      completed: 0,
      refunded: 0,
      cancelled: 0,
      terminated: 0,
      other: 2,
    });
  });

  it('returns stable empty metrics', () => {
    const totals = aggregate([]);
    expect(totals).toEqual({ total: 0, completed: 0, refunded: 0, cancelled: 0, terminated: 0, other: 0 });
    expect(successMetric(totals, 'refund')).toEqual({ numerator: 0, denominator: 0, rate: null });
    expect(deliveryMetricRows([], 'per')).toEqual([]);
    expect(buildMatrixMetrics([], 'refund').size).toBe(0);
  });
});

describe('Zinc travel dates', () => {
  it('strictly parses and formats dd-MM-yyyy', () => {
    const leapDay = parseZincDate('29-02-2024');
    expect(leapDay).toMatchObject({ year: 2024, month: 2, day: 29 });
    expect(formatZincDate(leapDay!)).toBe('29-02-2024');
    expect(parseZincDate('29-02-2023')).toBeNull();
    expect(parseZincDate('2024-02-29')).toBeNull();
    expect(formatZincDate({ year: 2023, month: 2, day: 29 })).toBeNull();
  });

  it('derives today from Singapore rather than the browser timezone', () => {
    const date = singaporeToday(new Date('2026-07-09T16:30:00.000Z'));
    expect(date).toMatchObject({ year: 2026, month: 7, day: 10 });
    expect(formatZincDate(date)).toBe('10-07-2026');
  });
});
