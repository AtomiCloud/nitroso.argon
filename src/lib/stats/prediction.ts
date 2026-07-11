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
  leadBucket: string; // the slot's CURRENT lead bucket (departure SGT − now)
};

// which optional dimensions the resolving level actually matched; (time,
// direction) are always required so they're implicit
export type OddsMatched = {
  day: boolean;
  demand: boolean;
  lead: boolean;
};

// fallback: 0 = exact cell (day, time, direction, demand, lead);
// 1 = lead dropped; 2 = demand dropped; 3 = both dropped; 4 = day dropped
// too (time + direction only)
export type OddsPrediction = {
  rate: number; // percent
  num: number; // completed
  den: number; // completed + refunded
  samples: number; // ALL bookings in the matched cell, every outcome
  level: 0 | 1 | 2 | 3 | 4;
  matched: OddsMatched;
};

// how much information backs the number, for the UI. Two independent 1–3
// scores; the sample size can CAP a full-dimension match:
//   dims    — 3 = day + demand matched (levels 0–1; lead-time optional);
//             2 = day + lead matched but not demand (level 2); 1 = only
//             day/time/direction or less (levels 3–4)
//   samples — over den (resolved bookings at the matched level):
//             3 = den ≥ SAMPLE_HIGH_MIN; 2 = den ≥ SAMPLE_MEDIUM_MIN;
//             1 = below SAMPLE_MEDIUM_MIN
//   confidence = min(dims, samples): 3 = high, 2 = medium, 1 = low
export type OddsConfidence = 'high' | 'medium' | 'low';

export const SAMPLE_HIGH_MIN = 50;
export const SAMPLE_MEDIUM_MIN = 15;

export function oddsConfidence(p: OddsPrediction): OddsConfidence {
  // L1 (day + demand matched, lead not) earns full dims score alongside L0:
  // prod L0 cells almost never accumulate 50 resolved bookings (2 cells in
  // all of prod), demand is the dominant signal, and lead-time is the least
  // stable dimension — so requiring the lead match would starve "high" of
  // any real data without adding signal. The OddsStat checklist still shows
  // ✗ Lead time honestly for L1.
  const dims = p.level <= 1 ? 3 : p.level === 2 ? 2 : 1;
  const samples = p.den >= SAMPLE_HIGH_MIN ? 3 : p.den >= SAMPLE_MEDIUM_MIN ? 2 : 1;
  const score = Math.min(dims, samples);
  return score === 3 ? 'high' : score === 2 ? 'medium' : 'low';
}

function rateOver(rs: BookingStatRes[]): { rate: number; num: number; den: number; samples: number } | null {
  let completed = 0;
  let refunded = 0;
  let samples = 0;
  for (const r of rs) {
    completed += r.completed;
    refunded += r.refunded;
    samples += r.total;
  }
  const den = completed + refunded;
  // den 0 = nothing in the cell has resolved yet — no signal, fall back
  return den === 0 ? null : { rate: (completed / den) * 100, num: completed, den, samples };
}

/**
 * Walk the fallback chain (most → least specific) until a cell with resolved
 * bookings exists. Every level requires (time, direction); the optional dims
 * are day of week, demand bucket, and lead bucket:
 *   L0: day + demand + lead → L1: day + demand → L2: day + lead →
 *   L3: day → L4: none → null (render "n/a").
 */
export function predictOdds(rows: BookingStatRes[], ctx: OddsContext): OddsPrediction | null {
  const base = rows.filter(r => r.time === ctx.time && r.direction === ctx.direction);
  const day = (r: BookingStatRes) => r.dayOfWeek === ctx.dayOfWeek;
  const demand = (r: BookingStatRes) => r.demandBucket === ctx.demandBucket;
  const lead = (r: BookingStatRes) => r.bucket === ctx.leadBucket;

  const levels: [(r: BookingStatRes) => boolean, OddsPrediction['level'], OddsMatched][] = [
    [r => day(r) && demand(r) && lead(r), 0, { day: true, demand: true, lead: true }],
    [r => day(r) && demand(r), 1, { day: true, demand: true, lead: false }],
    [r => day(r) && lead(r), 2, { day: true, demand: false, lead: true }],
    [day, 3, { day: true, demand: false, lead: false }],
    [() => true, 4, { day: false, demand: false, lead: false }],
  ];
  for (const [match, level, matched] of levels) {
    const r = rateOver(base.filter(match));
    if (r != null) return { ...r, level, matched };
  }
  return null;
}

// odds coloring per the odds spec: green ≥ 70, amber 40–70, red < 40
// (deliberately NOT /stats' 80/50 rate ladder — odds are a purchase nudge)
export function oddsClass(rate: number): string {
  if (rate >= 70) return 'bg-green-500';
  if (rate >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

// same thresholds as oddsClass, as legible text tokens (light + dark)
export function oddsTextClass(rate: number): string {
  if (rate >= 70) return 'text-green-600 dark:text-green-400';
  if (rate >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// the meter's unfilled track: a washed-out step of the fill's own hue so the
// bar reads as one severity end-to-end
export function oddsTrackClass(rate: number): string {
  if (rate >= 70) return 'bg-green-500/20';
  if (rate >= 40) return 'bg-amber-500/20';
  return 'bg-red-500/20';
}
