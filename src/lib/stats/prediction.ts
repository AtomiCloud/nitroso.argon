// Live-odds prediction for /schedules (ADMIN only): given the historical
// BookingStatRes rows and a slot's CURRENT context, estimate the chance a
// booking made now completes. Definition is refund-only —
// completed / (completed + refunded) — matching /stats' default.
import type { BookingStatRes } from '$lib/api/core/data-contracts';

export type OddsContext = {
  dayOfWeek: string; // English day name, matching zinc rows ("Monday" …)
  time: string; // HH:mm:ss, matching zinc rows
  direction: string; // WToJ | JToW
  demandBucket: string; // the slot's CURRENT demand bucket from live counts
};

// fallback: 0 = exact cell (day, time, direction, demand); 1 = demand match
// dropped; 2 = day match dropped too (time + direction only)
export type OddsPrediction = {
  rate: number; // percent
  num: number; // completed
  den: number; // completed + refunded
  level: 0 | 1 | 2;
};

function rateOver(rs: BookingStatRes[]): { rate: number; num: number; den: number } | null {
  let completed = 0;
  let refunded = 0;
  for (const r of rs) {
    completed += r.completed;
    refunded += r.refunded;
  }
  const den = completed + refunded;
  // den 0 = nothing in the cell has resolved yet — no signal, fall back
  return den === 0 ? null : { rate: (completed / den) * 100, num: completed, den };
}

/**
 * Walk the fallback chain until a cell with resolved bookings exists:
 * (day, time, direction, demand) → (day, time, direction) → (time,
 * direction) → null (render "n/a").
 */
export function predictOdds(rows: BookingStatRes[], ctx: OddsContext): OddsPrediction | null {
  const byTimeDir = rows.filter(r => r.time === ctx.time && r.direction === ctx.direction);
  const byDay = byTimeDir.filter(r => r.dayOfWeek === ctx.dayOfWeek);
  const exact = byDay.filter(r => r.demandBucket === ctx.demandBucket);

  const levels: [BookingStatRes[], 0 | 1 | 2][] = [
    [exact, 0],
    [byDay, 1],
    [byTimeDir, 2],
  ];
  for (const [rs, level] of levels) {
    const r = rateOver(rs);
    if (r != null) return { ...r, level };
  }
  return null;
}

// badge coloring per the odds spec: green ≥ 70, amber 40–70, red < 40
// (deliberately NOT /stats' 80/50 rate ladder — odds are a purchase nudge)
export function oddsClass(rate: number): string {
  if (rate >= 70) return 'bg-green-500';
  if (rate >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}
