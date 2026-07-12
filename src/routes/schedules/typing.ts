// Per-slot queue count. `total` is what old zinc served as ticketsNeeded;
// new zinc (PR #39) splits it into priority + normal — both null when the
// split is absent (old zinc), and the queue badge falls back to the total.
// The odds context ALWAYS buckets on `total`: total demand is what the
// historical demandBucket measured, so the split must not change prediction
// inputs.
export type SlotCount = {
  total: number;
  priority: number | null;
  normal: number | null;
};

// time -> count
export type Timings = Record<string, SlotCount>;

/**
 * One BookingCountRes (or none — a slot zinc reported no queue for) →
 * SlotCount. The split only counts when BOTH fields arrived and they add up
 * to the total; a half-present or inconsistent split (mixed rollout,
 * proxy stripping fields) falls back to total-only rather than showing a
 * plausible-but-wrong pair.
 */
export function toSlotCount(res?: { ticketsNeeded: number; priority?: number; normal?: number }): SlotCount {
  const total = res?.ticketsNeeded ?? 0;
  const p = res?.priority;
  const n = res?.normal;
  const split = typeof p === 'number' && typeof n === 'number' && p >= 0 && n >= 0 && p + n === total;
  return { total, priority: split ? p : null, normal: split ? n : null };
}
