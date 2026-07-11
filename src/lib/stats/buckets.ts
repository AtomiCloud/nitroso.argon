// The ONE client-side copy of zinc's stats bucket ladders (see zinc's
// BookingStats.cs — LeadLadder / DemandLadder / DeliveryLadder). Both /stats
// (historical re-aggregation) and /schedules (live odds context) import from
// here so the two pages can never disagree on bucket boundaries or order.
//
// Boundaries are inclusive on the tight side, exactly like zinc: a booking
// made exactly 6h before departure is "6h"; a slot with exactly 5 bookings
// is "0-5".

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DIRECTIONS = ['WToJ', 'JToW'];

// lead-time ladder (purchase → departure), inclusive upper bounds in hours
const LEAD_LADDER: [number, string][] = [
  [6, '6h'],
  [12, '12h'],
  [24, '24h'],
  [48, '2d'],
  [72, '3d'],
  [96, '4d'],
  [24 * 7, '1w'],
  [24 * 14, '2w'],
  [24 * 21, '3w'],
  [24 * 28, '4w'],
  [24 * 31, '1m'],
  [24 * 61, '2m'],
  [24 * 92, '3m'],
  [24 * 183, '6m'],
];
const LEAD_OVERFLOW = '6m+';

// queue-depth ladder (bookings competing for the same slot), inclusive counts
const DEMAND_LADDER: [number, string][] = [
  [5, '0-5'],
  [10, '5-10'],
  [20, '10-20'],
  [30, '20-30'],
];
const DEMAND_OVERFLOW = '30+';

// lead-time buckets (purchase → departure), shortest first
export const BUCKETS = [...LEAD_LADDER.map(([, label]) => label), LEAD_OVERFLOW];
// queue-depth buckets (bookings competing for the same slot), least first
export const DEMAND_BUCKETS = [...DEMAND_LADDER.map(([, label]) => label), DEMAND_OVERFLOW];
// delivery-lead buckets (ticket secured → departure), shortest first;
// null on non-completed rows
export const DELIVERY_BUCKETS = ['1h', '2h', '3h', '4h', '5h', '6h', '12h', '24h', '48h', '48h+'];

function bucketOf(value: number, ladder: [number, string][], overflow: string): string {
  for (const [bound, label] of ladder) if (value <= bound) return label;
  return overflow;
}

/** zinc's LeadTimeBucket twin: hours between now/purchase and departure. */
export function leadBucketOf(hoursBeforeDeparture: number): string {
  return bucketOf(hoursBeforeDeparture, LEAD_LADDER, LEAD_OVERFLOW);
}

/** zinc's DemandBucket twin: bookings sharing the same slot instance. */
export function demandBucketOf(slotCount: number): string {
  return bucketOf(slotCount, DEMAND_LADDER, DEMAND_OVERFLOW);
}
