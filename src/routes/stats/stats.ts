// Pure constants and aggregation helpers for Zinc's pre-grouped booking
// statistics. The API row grain is day × time × direction × lead bucket ×
// priority × demand bucket × delivery bucket; every UI view re-aggregates it.
import { CalendarDate } from '@internationalized/date';
import type { BookingStatRes } from '$lib/api/core/data-contracts';
import { formatNumber } from '$lib/i18n';
import type { SupportedLocale } from '$lib/i18n/resolve';

export const DAYS: readonly string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DIRECTIONS: readonly string[] = ['WToJ', 'JToW'];

// Keep these in Zinc's semantic order. Lexical sorting gives incorrect
// cumulative comparisons (for example, 12h would sort before 1h).
export const LEAD_BUCKETS: readonly string[] = [
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
];
// Backwards-compatible name used by the current page.
export const BUCKETS = LEAD_BUCKETS;
export const DEMAND_BUCKETS: readonly string[] = ['0-5', '5-10', '10-20', '20-30', '30+'];
export const DELIVERY_BUCKETS: readonly string[] = ['1h', '2h', '3h', '4h', '5h', '6h', '12h', '24h', '48h', '48h+'];
const API_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

// Direction → consistent tint/dot used across every table and matrix.
export const DIR_TINT: Readonly<Record<string, string>> = {
  WToJ: 'bg-blue-500/10',
  JToW: 'bg-purple-500/10',
};
export const DIR_DOT: Readonly<Record<string, string>> = {
  WToJ: 'bg-blue-500',
  JToW: 'bg-purple-500',
};

export type BucketMode = 'per' | 'le' | 'ge';
export type PriorityMode = 'all' | 'priority' | 'regular';
export type SuccessDefinition = 'refund' | 'refundCancel';

export type Agg = {
  total: number;
  completed: number;
  refunded: number;
  cancelled: number;
  terminated: number;
  other: number;
};

function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function aggregate(rows: readonly BookingStatRes[]): Agg {
  const result: Agg = {
    total: 0,
    completed: 0,
    refunded: 0,
    cancelled: 0,
    terminated: 0,
    other: 0,
  };

  for (const row of rows) {
    result.total += safeCount(row?.total);
    result.completed += safeCount(row?.completed);
    result.refunded += safeCount(row?.refunded);
    result.cancelled += safeCount(row?.cancelled);
    result.terminated += safeCount(row?.terminated);
    result.other += safeCount(row?.other);
  }
  return result;
}

export function failedOf(aggregateResult: Agg, definition: SuccessDefinition | string): number {
  return aggregateResult.refunded + (definition === 'refundCancel' ? aggregateResult.cancelled : 0);
}

export type RatioMetric = {
  numerator: number;
  denominator: number;
  rate: number | null;
};

export function successMetric(aggregateResult: Agg, definition: SuccessDefinition | string): RatioMetric {
  const numerator = aggregateResult.completed;
  const denominator = numerator + failedOf(aggregateResult, definition);
  return {
    numerator,
    denominator,
    rate: denominator === 0 ? null : (numerator / denominator) * 100,
  };
}

// Null means that no booking has resolved to success/failure yet.
export function rateOf(aggregateResult: Agg, definition: SuccessDefinition | string): number | null {
  return successMetric(aggregateResult, definition).rate;
}

export function rateClass(rate: number | null): string {
  if (rate == null) return 'text-muted-foreground';
  if (rate >= 80) return 'text-green-600 dark:text-green-400';
  if (rate >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function barClass(rate: number): string {
  if (rate >= 80) return 'bg-green-500';
  if (rate >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function rateText(rate: number | null, locale: SupportedLocale): string {
  return rate == null ? '—' : `${formatNumber(rate, locale, { maximumFractionDigits: 1 })}%`;
}

export type StatRow = {
  key: string;
  label: string;
  dir: string;
  total: number;
  rate: number | null;
  num: number;
  den: number;
};

export function toStatRow(
  key: string,
  label: string,
  direction: string,
  rows: readonly BookingStatRes[],
  definition: SuccessDefinition | string,
): StatRow {
  const totals = aggregate(rows);
  const metric = successMetric(totals, definition);
  return {
    key,
    label,
    dir: direction,
    total: totals.total,
    rate: metric.rate,
    num: metric.numerator,
    den: metric.denominator,
  };
}

export type SuccessMetricGroup = {
  key: string;
  label: string;
  direction?: string | null;
  rows: readonly BookingStatRes[];
};

export function successMetricRows(
  groups: readonly SuccessMetricGroup[],
  definition: SuccessDefinition | string,
): StatRow[] {
  return groups.map(group => toStatRow(group.key, group.label, group.direction ?? '', group.rows, definition));
}

export function bucketMatches(
  value: string | null | undefined,
  selected: string | null | undefined,
  order: readonly string[],
  mode: BucketMode = 'per',
): boolean {
  if (!value || !selected) return false;
  const valueIndex = order.indexOf(value);
  const selectedIndex = order.indexOf(selected);
  if (valueIndex < 0 || selectedIndex < 0) return false;

  if (mode === 'per') return valueIndex === selectedIndex;
  if (mode === 'le') return valueIndex <= selectedIndex;
  // Zinc buckets are inclusive upper-bound intervals. For example, "2h"
  // contains values >1h and <=2h, so the user's "more than 2h" question must
  // start at the NEXT bucket. A trailing-plus bucket already represents the
  // open-ended side of its threshold and therefore includes itself.
  if (mode === 'ge') {
    return selected.endsWith('+') ? valueIndex >= selectedIndex : valueIndex > selectedIndex;
  }
  return false;
}

export function leadBucketMatches(
  value: string | null | undefined,
  selected: string | null | undefined,
  mode: BucketMode = 'per',
): boolean {
  return bucketMatches(value, selected, LEAD_BUCKETS, mode);
}

export function deliveryBucketMatches(
  value: string | null | undefined,
  selected: string | null | undefined,
  mode: BucketMode = 'per',
): boolean {
  return bucketMatches(value, selected, DELIVERY_BUCKETS, mode);
}

export function priorityMatches(priority: boolean | null | undefined, mode: PriorityMode = 'all'): boolean {
  if (mode === 'all') return true;
  if (mode === 'priority') return priority === true;
  if (mode === 'regular') return priority === false;
  return false;
}

export type StatsFilters = {
  day?: string | null;
  direction?: string | null;
  time?: string | null;
  leadBucket?: string | null;
  leadMode?: BucketMode;
  priority?: PriorityMode | null;
  slotLoadBucket?: string | null;
};

function selected(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function filterStatsRows(
  rows: readonly BookingStatRes[],
  filters: Readonly<StatsFilters> = {},
): BookingStatRes[] {
  return rows.filter(row => {
    if (selected(filters.day) && row?.dayOfWeek !== filters.day) return false;
    if (selected(filters.direction) && row?.direction !== filters.direction) return false;
    if (selected(filters.time) && row?.time !== filters.time) return false;
    if (!priorityMatches(row?.priority, filters.priority ?? 'all')) return false;
    // DemandBucket is computed by Zinc from every request sharing the exact
    // travel date + departure time + direction. Filtering the response must
    // never recompute that slot load from the smaller client-side slice.
    if (selected(filters.slotLoadBucket) && row?.demandBucket !== filters.slotLoadBucket) return false;
    if (
      selected(filters.leadBucket) &&
      !leadBucketMatches(row?.bucket, filters.leadBucket, filters.leadMode ?? 'per')
    ) {
      return false;
    }
    return true;
  });
}

function metricRowsForValues(
  rows: readonly BookingStatRes[],
  values: readonly string[],
  valueOf: (row: BookingStatRes) => string | null | undefined,
  definition: SuccessDefinition | string,
  directionOf: (value: string) => string = () => '',
): StatRow[] {
  return values.map(value =>
    toStatRow(
      value,
      value,
      directionOf(value),
      rows.filter(row => valueOf(row) === value),
      definition,
    ),
  );
}

function presentValues(
  rows: readonly BookingStatRes[],
  order: readonly string[],
  valueOf: (row: BookingStatRes) => string | null | undefined,
): string[] {
  const present = new Set(rows.map(valueOf).filter((value): value is string => typeof value === 'string'));
  return order.filter(value => present.has(value));
}

/** Success metrics grouped by 24-hour departure time, combining directions. */
export function timeMetricRows(rows: readonly BookingStatRes[], definition: SuccessDefinition | string): StatRow[] {
  const times = [
    ...new Set(
      rows.map(row => row?.time).filter((time): time is string => typeof time === 'string' && API_TIME.test(time)),
    ),
  ].sort();
  return metricRowsForValues(rows, times, row => row?.time, definition).map(metric => ({
    ...metric,
    label: metric.key.slice(0, 5),
  }));
}

/** Success metrics grouped by direction in the product's canonical order. */
export function directionMetricRows(
  rows: readonly BookingStatRes[],
  definition: SuccessDefinition | string,
): StatRow[] {
  const directions = presentValues(rows, DIRECTIONS, row => row?.direction);
  return metricRowsForValues(
    rows,
    directions,
    row => row?.direction,
    definition,
    direction => direction,
  );
}

/** Success metrics grouped Monday through Sunday. */
export function weekdayMetricRows(rows: readonly BookingStatRes[], definition: SuccessDefinition | string): StatRow[] {
  const days = presentValues(rows, DAYS, row => row?.dayOfWeek);
  return metricRowsForValues(rows, days, row => row?.dayOfWeek, definition);
}

/**
 * Success metrics grouped by purchase-to-departure lead time. Cumulative
 * rows sum the raw outcome counts first; they never average bucket rates.
 */
export function purchaseLeadMetricRows(
  rows: readonly BookingStatRes[],
  definition: SuccessDefinition | string,
  mode: BucketMode = 'per',
): StatRow[] {
  if (rows.length === 0) return [];
  return LEAD_BUCKETS.map(bucket =>
    toStatRow(
      bucket,
      bucket,
      '',
      rows.filter(row => leadBucketMatches(row?.bucket, bucket, mode)),
      definition,
    ),
  );
}

/**
 * Success metrics by Zinc's precomputed exact-slot load. The load dimension
 * is contextual (all requests in date + time + direction), even when the
 * supplied outcome rows have already been narrowed by another filter.
 */
export function slotLoadMetricRows(rows: readonly BookingStatRes[], definition: SuccessDefinition | string): StatRow[] {
  if (rows.length === 0) return [];
  return metricRowsForValues(rows, DEMAND_BUCKETS, row => row?.demandBucket, definition);
}

function hasCanonicalDeliveryBucket(row: BookingStatRes): row is BookingStatRes & { deliveryBucket: string } {
  return typeof row?.deliveryBucket === 'string' && DELIVERY_BUCKETS.includes(row.deliveryBucket);
}

export function completedWithDelivery(rows: readonly BookingStatRes[]): number {
  return rows.filter(hasCanonicalDeliveryBucket).reduce((sum, row) => sum + safeCount(row.completed), 0);
}

export type DeliveryMetricRow = {
  key: string;
  label: string;
  completed: number;
  totalCompleted: number;
  share: number | null;
  numerator: number;
  denominator: number;
};

// The denominator is deliberately fixed across every row: all completed
// bookings with a valid delivery bucket in the already globally-filtered
// slice. Null/unknown delivery buckets never enter the distribution.
export function deliveryMetricRows(rows: readonly BookingStatRes[], mode: BucketMode = 'per'): DeliveryMetricRow[] {
  const eligible = rows.filter(hasCanonicalDeliveryBucket);
  const totalCompleted = completedWithDelivery(eligible);
  if (eligible.length === 0) return [];

  // Render the full ladder even when an exact interval has zero samples. A
  // cumulative threshold remains meaningful without a row in that one bucket.
  return DELIVERY_BUCKETS.map(bucket => {
    const completed = eligible
      .filter(row => deliveryBucketMatches(row.deliveryBucket, bucket, mode))
      .reduce((sum, row) => sum + safeCount(row.completed), 0);
    return {
      key: bucket,
      label: bucket,
      completed,
      totalCompleted,
      share: totalCompleted === 0 ? null : (completed / totalCompleted) * 100,
      numerator: completed,
      denominator: totalCompleted,
    };
  });
}

export type DeliveryCutoffMetric = RatioMetric & {
  cutoff: string;
  totalCompleted: number;
};

/**
 * Chance that a request is successfully delivered at least the selected
 * amount of time before departure. Delivery buckets are inclusive upper
 * bounds, so buckets after the selected cutoff qualify (and the trailing
 * `48h+` bucket qualifies for its own open-ended cutoff).
 *
 * The denominator deliberately includes every completion plus the selected
 * failure outcomes. A completion delivered too late (or with an unknown
 * delivery bucket) therefore remains a miss instead of disappearing.
 */
export function deliveryCutoffMetric(
  rows: readonly BookingStatRes[],
  cutoff: string,
  definition: SuccessDefinition | string,
): DeliveryCutoffMetric | null {
  if (!DELIVERY_BUCKETS.includes(cutoff)) return null;

  const totals = aggregate(rows);
  const numerator = rows
    .filter(row => hasCanonicalDeliveryBucket(row) && deliveryBucketMatches(row.deliveryBucket, cutoff, 'ge'))
    .reduce((sum, row) => sum + safeCount(row.completed), 0);
  const denominator = totals.completed + failedOf(totals, definition);

  return {
    cutoff,
    totalCompleted: totals.completed,
    numerator,
    denominator,
    rate: denominator === 0 ? null : (numerator / denominator) * 100,
  };
}

/** One cumulative SLA metric for every canonical delivery cutoff. */
export function deliveryCutoffMetricRows(
  rows: readonly BookingStatRes[],
  definition: SuccessDefinition | string,
): DeliveryCutoffMetric[] {
  if (rows.length === 0) return [];
  return DELIVERY_BUCKETS.map(cutoff => deliveryCutoffMetric(rows, cutoff, definition)).filter(
    (metric): metric is DeliveryCutoffMetric => metric != null,
  );
}

export type DayTimeMatrixCell = RatioMetric & {
  key: string;
  day: string;
  time: string;
  total: number;
};

export type DayTimeMatrix = {
  /** Vertical axis, always Monday through Sunday. */
  days: string[];
  /** Horizontal axis, always ascending 24-hour departure times. */
  times: string[];
  /** Cells keyed by `day|time`; direction is intentionally not in the key. */
  cells: Map<string, DayTimeMatrixCell>;
};

export function dayTimeMetricKey(day: string | null | undefined, time: string | null | undefined): string | null {
  if (!day || !DAYS.includes(day)) return null;
  if (!time || !API_TIME.test(time)) return null;
  return `${day}|${time}`;
}

/**
 * Builds the visualization matrix with weekdays as rows and times as
 * columns. When the globally-filtered input contains both directions, their
 * raw counts are combined into one weighted cell.
 */
export function buildDayTimeMatrix(
  rows: readonly BookingStatRes[],
  definition: SuccessDefinition | string,
): DayTimeMatrix {
  const grouped = new Map<string, BookingStatRes[]>();

  for (const row of rows) {
    const key = dayTimeMetricKey(row?.dayOfWeek, row?.time);
    if (key == null) continue;
    const existing = grouped.get(key);
    if (existing) existing.push(row);
    else grouped.set(key, [row]);
  }

  const days = DAYS.filter(day => [...grouped.keys()].some(key => key.startsWith(`${day}|`)));
  const times = [
    ...new Set(
      [...grouped.values()]
        .flatMap(group => group.map(row => row.time))
        .filter((time): time is string => typeof time === 'string'),
    ),
  ].sort();
  const cells = new Map<string, DayTimeMatrixCell>();

  for (const [key, group] of grouped) {
    const totals = aggregate(group);
    const metric = successMetric(totals, definition);
    const [day, time] = key.split('|');
    cells.set(key, {
      key,
      day,
      time,
      total: totals.total,
      ...metric,
    });
  }

  return { days, times, cells };
}

export type MatrixMetric = {
  key: string;
  day: string;
  direction: string;
  time: string;
  total: number;
  numerator: number;
  denominator: number;
  rate: number | null;
};

// Direction is part of the key. Zinc does not promise that WToJ and JToW
// timetables never share the same HH:mm:ss value.
export function matrixMetricKey(
  direction: string | null | undefined,
  time: string | null | undefined,
  day: string | null | undefined,
): string | null {
  if (!direction || !DIRECTIONS.includes(direction)) return null;
  if (!time || !API_TIME.test(time)) return null;
  if (!day || !DAYS.includes(day)) return null;
  return `${direction}|${time}|${day}`;
}

export function buildMatrixMetrics(
  rows: readonly BookingStatRes[],
  definition: SuccessDefinition | string,
): Map<string, MatrixMetric> {
  const groups = new Map<string, { day: string; direction: string; time: string; rows: BookingStatRes[] }>();

  for (const row of rows) {
    const key = matrixMetricKey(row?.direction, row?.time, row?.dayOfWeek);
    if (key == null) continue;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(key, {
        day: row.dayOfWeek!,
        direction: row.direction!,
        time: row.time!,
        rows: [row],
      });
    }
  }

  const result = new Map<string, MatrixMetric>();
  for (const [key, group] of groups) {
    const totals = aggregate(group.rows);
    const metric = successMetric(totals, definition);
    result.set(key, {
      key,
      day: group.day,
      direction: group.direction,
      time: group.time,
      total: totals.total,
      numerator: metric.numerator,
      denominator: metric.denominator,
      rate: metric.rate,
    });
  }
  return result;
}

export const SINGAPORE_TIME_ZONE = 'Asia/Singapore';

export type CalendarDateLike = {
  year: number;
  month: number;
  day: number;
};

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function validCalendarDate(value: CalendarDateLike): boolean {
  return (
    Number.isInteger(value.year) &&
    value.year >= 1 &&
    value.year <= 9999 &&
    Number.isInteger(value.month) &&
    value.month >= 1 &&
    value.month <= 12 &&
    Number.isInteger(value.day) &&
    value.day >= 1 &&
    value.day <= daysInMonth(value.year, value.month)
  );
}

export function formatZincDate(value: CalendarDateLike): string | null {
  if (!validCalendarDate(value)) return null;
  const day = String(value.day).padStart(2, '0');
  const month = String(value.month).padStart(2, '0');
  return `${day}-${month}-${value.year}`;
}

export function parseZincDate(value: string | null | undefined): CalendarDate | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value ?? '');
  if (match == null) return null;
  const parsed = {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  };
  return validCalendarDate(parsed) ? new CalendarDate(parsed.year, parsed.month, parsed.day) : null;
}

const singaporeDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SINGAPORE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function singaporeToday(at: Date = new Date()): CalendarDate {
  const parts = Object.fromEntries(
    singaporeDateFormatter
      .formatToParts(at)
      .filter(part => part.type === 'year' || part.type === 'month' || part.type === 'day')
      .map(part => [part.type, Number(part.value)]),
  ) as Record<'year' | 'month' | 'day', number>;
  return new CalendarDate(parts.year, parts.month, parts.day);
}
