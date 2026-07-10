// Shared constants and pure aggregation helpers for the /stats page and its
// per-tab tables. Zinc pre-groups rows by (dayOfWeek, time, direction,
// lead-time bucket, priority, demandBucket, deliveryBucket); everything here
// is a client-side re-aggregation of those rows.
import type { BookingStatRes } from '$lib/api/core/data-contracts';
import { formatNumber } from '$lib/i18n';
import type { SupportedLocale } from '$lib/i18n/resolve';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DIRECTIONS = ['WToJ', 'JToW'];
// direction → consistent tint/dot used across every table and the matrix
// (blue = W → JB, purple = JB → W; the ONE legend at the top of the page)
export const DIR_TINT: Record<string, string> = { WToJ: 'bg-blue-500/10', JToW: 'bg-purple-500/10' };
export const DIR_DOT: Record<string, string> = { WToJ: 'bg-blue-500', JToW: 'bg-purple-500' };
// lead-time buckets (purchase → departure), shortest first
export const BUCKETS = ['6h', '12h', '24h', '2d', '3d', '4d', '1w', '2w', '3w', '4w', '1m', '2m', '3m', '6m', '6m+'];
// queue-depth buckets (bookings competing for the same slot), least first
export const DEMAND_BUCKETS = ['0-5', '5-10', '10-20', '20-30', '30+'];
// delivery-lead buckets (ticket secured → departure), shortest first;
// null on non-completed rows
export const DELIVERY_BUCKETS = ['1h', '2h', '3h', '4h', '5h', '6h', '12h', '24h', '48h', '48h+'];

export type Agg = {
  total: number;
  completed: number;
  refunded: number;
  cancelled: number;
};

export function aggregate(rs: BookingStatRes[]): Agg {
  const a: Agg = { total: 0, completed: 0, refunded: 0, cancelled: 0 };
  for (const r of rs) {
    a.total += r.total;
    a.completed += r.completed;
    a.refunded += r.refunded;
    a.cancelled += r.cancelled;
  }
  return a;
}

export function failedOf(a: Agg, def: string): number {
  return a.refunded + (def === 'refundCancel' ? a.cancelled : 0);
}

// null when no booking has resolved to success/failure yet
export function rateOf(a: Agg, def: string): number | null {
  const f = failedOf(a, def);
  const denominator = a.completed + f;
  return denominator === 0 ? null : (a.completed / denominator) * 100;
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

export function rateText(rate: number | null, l: SupportedLocale): string {
  return rate == null ? '—' : `${formatNumber(rate, l, { maximumFractionDigits: 1 })}%`;
}

export type StatRow = {
  key: string;
  label: string;
  // direction is conveyed purely by row COLOR (owner mandate); empty =
  // no direction dimension for this row
  dir: string;
  total: number;
  rate: number | null;
  // raw numerator/denominator behind the rate — the owner reads these as an
  // actuarial base, so every table shows them next to the percentage
  num: number;
  den: number;
};

export function toStatRow(key: string, label: string, dir: string, rs: BookingStatRes[], def: string): StatRow {
  const a = aggregate(rs);
  const f = failedOf(a, def);
  return { key, label, dir, total: a.total, rate: rateOf(a, def), num: a.completed, den: a.completed + f };
}
