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
  buildDayTimeMatrix,
  buildMatrixMetrics,
  completedWithDelivery,
  dayTimeMetricKey,
  deliveryCutoffMetric,
  deliveryCutoffMetricRows,
  deliveryMetricRows,
  directionMetricRows,
  filterStatsRows,
  formatZincDate,
  leadBucketMatches,
  matrixMetricKey,
  parseZincDate,
  priorityMatches,
  purchaseLeadMetricRows,
  singaporeToday,
  slotLoadMetricRows,
  successMetric,
  successMetricForRows,
  successMetricRows,
  timeMetricRows,
  toStatRow,
  weekdayMetricRows,
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
    stat({
      dayOfWeek: 'Monday',
      direction: 'WToJ',
      time: '08:00:00',
      bucket: '6h',
      priority: true,
      demandBucket: '0-5',
    }),
    stat({
      dayOfWeek: 'Monday',
      direction: 'WToJ',
      time: '08:00:00',
      bucket: '24h',
      priority: false,
      demandBucket: '10-20',
    }),
    stat({
      dayOfWeek: 'Tuesday',
      direction: 'WToJ',
      time: '08:00:00',
      bucket: '12h',
      priority: false,
      demandBucket: '0-5',
    }),
    stat({
      dayOfWeek: 'Monday',
      direction: 'JToW',
      time: '08:00:00',
      bucket: '12h',
      priority: false,
      demandBucket: '0-5',
    }),
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
        slotLoadBucket: '0-5',
      }),
    ).toEqual([rows[0]]);

    expect(
      filterStatsRows(rows, {
        day: 'Monday',
        direction: 'WToJ',
        leadBucket: '12h',
        leadMode: 'ge',
        priority: 'regular',
        slotLoadBucket: '10-20',
      }),
    ).toEqual([rows[1]]);
    expect(filterStatsRows(rows)).toEqual(rows);
  });
});

describe('visualization dimension grouping', () => {
  const rows = [
    stat({
      dayOfWeek: 'Sunday',
      time: '08:00:00',
      direction: 'WToJ',
      bucket: '6h',
      demandBucket: '0-5',
      total: 1,
      completed: 1,
      other: 0,
    }),
    stat({
      dayOfWeek: 'Monday',
      time: '08:00:00',
      direction: 'JToW',
      bucket: '12h',
      demandBucket: '20-30',
      total: 9,
      completed: 1,
      refunded: 8,
      other: 0,
    }),
    stat({
      dayOfWeek: 'Monday',
      time: '17:00:00',
      direction: 'WToJ',
      bucket: '12h',
      demandBucket: '20-30',
      total: 10,
      completed: 8,
      refunded: 2,
      other: 0,
    }),
  ];

  it('groups time, direction, and weekday in canonical order', () => {
    const byTime = timeMetricRows(rows, 'refund');
    expect(byTime.map(row => row.key)).toEqual(['08:00:00', '17:00:00']);
    // Weighted from raw counts: (1 + 1) / (1 + 9), not the mean of
    // the two source rates (100% and 11.1%).
    expect(byTime[0]).toMatchObject({ label: '08:00', num: 2, den: 10, rate: 20, total: 10 });

    const byDirection = directionMetricRows(rows, 'refund');
    expect(byDirection.map(row => row.key)).toEqual(['WToJ', 'JToW']);
    expect(byDirection.map(row => row.dir)).toEqual(['WToJ', 'JToW']);

    const byWeekday = weekdayMetricRows(rows, 'refund');
    expect(byWeekday.map(row => row.key)).toEqual(['Monday', 'Sunday']);
  });

  it('uses weighted raw sums for purchase-lead cumulative rows and slot load', () => {
    const byLead = purchaseLeadMetricRows(rows, 'refund', 'le');
    expect(byLead.find(row => row.key === '6h')).toMatchObject({ num: 1, den: 1, rate: 100 });
    expect(byLead.find(row => row.key === '12h')).toMatchObject({ num: 10, den: 20, rate: 50, total: 20 });

    const bySlotLoad = slotLoadMetricRows(rows, 'refund');
    expect(bySlotLoad).toHaveLength(DEMAND_BUCKETS.length);
    expect(bySlotLoad.find(row => row.key === '0-5')).toMatchObject({ num: 1, den: 1, rate: 100 });
    expect(bySlotLoad.find(row => row.key === '20-30')).toMatchObject({ num: 9, den: 19 });
    expect(bySlotLoad.find(row => row.key === '20-30')?.rate).toBeCloseTo(47.3684, 3);
  });

  it('drops malformed dimension values rather than creating misleading groups', () => {
    const malformed = [stat({ time: '8am', direction: 'Sideways', dayOfWeek: 'Funday' })];
    expect(timeMetricRows(malformed, 'refund')).toEqual([]);
    expect(directionMetricRows(malformed, 'refund')).toEqual([]);
    expect(weekdayMetricRows(malformed, 'refund')).toEqual([]);
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

describe('delivery cutoff SLA', () => {
  const rows = [
    stat({ deliveryBucket: '48h+', total: 4, completed: 4, other: 0 }),
    stat({ deliveryBucket: '12h', total: 2, completed: 2, other: 0 }),
    stat({ deliveryBucket: '2h', total: 3, completed: 3, other: 0 }),
    // Unknown/late completions and failures remain in the denominator.
    stat({ deliveryBucket: null, total: 1, completed: 1, other: 0 }),
    stat({ deliveryBucket: null, total: 2, refunded: 2, other: 0 }),
    stat({ deliveryBucket: null, total: 1, cancelled: 1, other: 0 }),
  ];

  it('counts only completions delivered beyond the selected cutoff', () => {
    expect(deliveryCutoffMetric(rows, '2h', 'refund')).toEqual({
      cutoff: '2h',
      totalCompleted: 10,
      numerator: 6,
      denominator: 12,
      rate: 50,
    });

    const includingCancellation = deliveryCutoffMetric(rows, '2h', 'refundCancel');
    expect(includingCancellation).toMatchObject({ numerator: 6, denominator: 13 });
    expect(includingCancellation?.rate).toBeCloseTo(46.1538, 3);
  });

  it('keeps late completions in the denominator and supports the open-ended cutoff', () => {
    expect(deliveryCutoffMetric(rows, '12h', 'refund')).toMatchObject({ numerator: 4, denominator: 12 });
    expect(deliveryCutoffMetric(rows, '48h+', 'refund')).toMatchObject({ numerator: 4, denominator: 12 });

    const metrics = deliveryCutoffMetricRows(rows, 'refund');
    expect(metrics).toHaveLength(DELIVERY_BUCKETS.length - 1);
    expect(metrics.at(-1)?.cutoff).toBe('48h');
    expect(metrics.every(metric => metric.denominator === 12)).toBe(true);
    expect(deliveryCutoffMetric(rows, 'not-a-cutoff', 'refund')).toBeNull();
  });

  it('applies one selected cutoff to summaries and every grouped visualization', () => {
    expect(successMetricForRows(rows, 'refund', '2h')).toMatchObject({ numerator: 6, denominator: 12, rate: 50 });
    expect(timeMetricRows(rows, 'refund', '2h')[0]).toMatchObject({ num: 6, den: 12, rate: 50 });
    expect(directionMetricRows(rows, 'refund', '2h')[0]).toMatchObject({ num: 6, den: 12, rate: 50 });
    expect(weekdayMetricRows(rows, 'refund', '2h')[0]).toMatchObject({ num: 6, den: 12, rate: 50 });
    expect(slotLoadMetricRows(rows, 'refund', '2h')[0]).toMatchObject({ num: 6, den: 12, rate: 50 });
    expect(buildDayTimeMatrix(rows, 'refund', '2h').cells.get('Monday|08:00:00')).toMatchObject({
      numerator: 6,
      denominator: 12,
      rate: 50,
    });
  });
});

describe('day rows × time columns matrix', () => {
  const rows = [
    stat({
      dayOfWeek: 'Monday',
      time: '08:00:00',
      direction: 'WToJ',
      total: 4,
      completed: 3,
      refunded: 1,
      other: 0,
    }),
    stat({
      dayOfWeek: 'Monday',
      time: '08:00:00',
      direction: 'JToW',
      total: 3,
      completed: 2,
      cancelled: 1,
      other: 0,
    }),
    stat({
      dayOfWeek: 'Tuesday',
      time: '17:00:00',
      direction: 'WToJ',
      total: 2,
      completed: 1,
      refunded: 1,
      other: 0,
    }),
  ];

  it('combines directions into weighted cells when the global filter is All', () => {
    const matrix = buildDayTimeMatrix(rows, 'refundCancel');
    expect(matrix.days).toEqual(['Monday', 'Tuesday']);
    expect(matrix.times).toEqual(['08:00:00', '17:00:00']);
    expect(dayTimeMetricKey('Monday', '08:00:00')).toBe('Monday|08:00:00');
    expect(matrix.cells.get('Monday|08:00:00')).toMatchObject({
      numerator: 5,
      denominator: 7,
      total: 7,
    });
    expect(matrix.cells.get('Monday|08:00:00')?.rate).toBeCloseTo(71.4286, 3);
  });

  it('uses the selected direction when the shared filter narrows the input', () => {
    const filtered = filterStatsRows(rows, { direction: 'WToJ' });
    const matrix = buildDayTimeMatrix(filtered, 'refundCancel');
    expect(matrix.cells.get('Monday|08:00:00')).toMatchObject({ numerator: 3, denominator: 4, rate: 75 });
  });

  it('skips malformed axes and returns stable empty axes', () => {
    const malformed = [stat({ dayOfWeek: 'Funday' }), stat({ time: '8am' })];
    expect(buildDayTimeMatrix(malformed, 'refund')).toEqual({ days: [], times: [], cells: new Map() });
    expect(dayTimeMetricKey('Funday', '08:00:00')).toBeNull();
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
