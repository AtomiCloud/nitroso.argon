// Shared constants and pure aggregation helpers for the /stats page and its
// per-tab tables. Zinc pre-groups rows by (dayOfWeek, time, direction,
// lead-time bucket, priority, demandBucket, deliveryBucket); everything here
// is a client-side re-aggregation of those rows.
import type { BookingStatRes } from '$lib/api/core/data-contracts';
import { formatNumber } from '$lib/i18n';
import type { SupportedLocale } from '$lib/i18n/resolve';
import { BUCKETS, DAYS, DELIVERY_BUCKETS, DEMAND_BUCKETS, DIRECTIONS } from '$lib/stats/buckets';

// bucket ladders live in $lib/stats/buckets (shared with the /schedules live
// odds); re-exported so existing imports keep working
export { BUCKETS, DAYS, DELIVERY_BUCKETS, DEMAND_BUCKETS, DIRECTIONS };

// direction → consistent tint/dot used across every table and the matrix
// (blue = W → JB, purple = JB → W; the ONE legend at the top of the page)
export const DIR_TINT: Record<string, string> = { WToJ: 'bg-blue-500/10', JToW: 'bg-purple-500/10' };
export const DIR_DOT: Record<string, string> = { WToJ: 'bg-blue-500', JToW: 'bg-purple-500' };

// delivery-lead cutoffs offered by the "Delivery lead" success redefinition;
// "1h" is excluded (every delivery is at least ~instantaneous, a 1h floor is
// noise) so the minimum meaningful cutoff is "2h"
export const DELIVERY_CUTOFFS = DELIVERY_BUCKETS.slice(1);

// Does a completed row's delivery lead satisfy the cutoff ("delivered at
// least this long before departure")? A null deliveryBucket on a completed
// row is a legacy/unbucketed completion — we cannot verify it was delivered
// in time, so under an active cutoff it counts as NOT meeting it (fail).
export function deliveryMeetsCutoff(deliveryBucket: string | null | undefined, cutoff: string): boolean {
  const i = DELIVERY_BUCKETS.indexOf(deliveryBucket ?? '');
  const c = DELIVERY_BUCKETS.indexOf(cutoff);
  return i !== -1 && c !== -1 && i >= c;
}

export type Agg = {
  total: number;
  completed: number;
  // completed AND delivered at/above the delivery cutoff ("" = no cutoff, so
  // timely === completed). The SUCCESS NUMERATOR: a cutoff redefines success
  // without touching the denominator — late/unverifiable completions flip
  // from success to failure.
  timely: number;
  refunded: number;
  cancelled: number;
};

export function aggregate(rs: BookingStatRes[], dlvCutoff = ''): Agg {
  const a: Agg = { total: 0, completed: 0, timely: 0, refunded: 0, cancelled: 0 };
  for (const r of rs) {
    a.total += r.total;
    a.completed += r.completed;
    a.timely += dlvCutoff === '' || deliveryMeetsCutoff(r.deliveryBucket, dlvCutoff) ? r.completed : 0;
    a.refunded += r.refunded;
    a.cancelled += r.cancelled;
  }
  return a;
}

export function failedOf(a: Agg, def: string): number {
  return a.refunded + (def === 'refundCancel' ? a.cancelled : 0);
}

// null when no booking has resolved to success/failure yet. The denominator
// is UNCHANGED by a delivery cutoff (completed + failed under the definition);
// only the numerator shrinks to the timely completions.
export function rateOf(a: Agg, def: string): number | null {
  const f = failedOf(a, def);
  const denominator = a.completed + f;
  return denominator === 0 ? null : (a.timely / denominator) * 100;
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

export function toStatRow(
  key: string,
  label: string,
  dir: string,
  rs: BookingStatRes[],
  def: string,
  dlvCutoff = '',
): StatRow {
  const a = aggregate(rs, dlvCutoff);
  const f = failedOf(a, def);
  return { key, label, dir, total: a.total, rate: rateOf(a, def), num: a.timely, den: a.completed + f };
}
