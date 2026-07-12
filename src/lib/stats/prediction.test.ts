import { describe, expect, it } from 'vitest';
import type { BookingStatRes } from '$lib/api/core/data-contracts';
import {
  oddsClass,
  oddsConfidence,
  predictOdds,
  SAMPLE_HIGH_MIN,
  SAMPLE_MEDIUM_MIN,
  type OddsPrediction,
} from './prediction';

function row(over: Partial<BookingStatRes>): BookingStatRes {
  return {
    dayOfWeek: 'Monday',
    time: '08:00:00',
    direction: 'WToJ',
    bucket: '24h',
    priority: false,
    demandBucket: '5-10',
    deliveryBucket: null,
    total: 0,
    completed: 0,
    refunded: 0,
    cancelled: 0,
    terminated: 0,
    other: 0,
    ...over,
  };
}

const ctx = {
  dayOfWeek: 'Monday',
  time: '08:00:00',
  direction: 'WToJ',
  demandBucket: '5-10',
  leadBucket: '24h',
};

describe('predictOdds fallback chain', () => {
  it('level 0: exact (day, time, direction, demand, lead) cell', () => {
    const rows = [
      row({ completed: 20, refunded: 5, cancelled: 15, total: 40 }),
      // decoys that must NOT contaminate the exact cell
      row({ demandBucket: '30+', completed: 0, refunded: 50, total: 50 }),
      row({ bucket: '2w', completed: 0, refunded: 50, total: 50 }),
      row({ dayOfWeek: 'Friday', completed: 0, refunded: 50, total: 50 }),
      row({ direction: 'JToW', completed: 0, refunded: 50, total: 50 }),
      row({ time: '17:30:00', completed: 0, refunded: 50, total: 50 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p).toEqual({
      rate: 80,
      num: 20,
      den: 25,
      samples: 40,
      level: 0,
      matched: { day: true, demand: true, lead: true },
    });
  });

  it('cancellations do not enter the refund-only denominator, but do count as samples', () => {
    const p = predictOdds([row({ completed: 3, refunded: 1, cancelled: 96, total: 100 })], ctx);
    expect(p?.rate).toBe(75);
    expect(p?.den).toBe(4);
    expect(p?.samples).toBe(100);
    expect(p?.level).toBe(0);
  });

  it('level 1: drops the lead match when the exact cell is empty', () => {
    const rows = [
      // same day + demand, different lead buckets
      row({ bucket: '2w', completed: 6, refunded: 2, total: 10 }),
      row({ bucket: '6h', completed: 2, refunded: 2, total: 8 }),
      // decoy: matching lead but wrong demand must not resolve first
      row({ demandBucket: '30+', completed: 0, refunded: 50, total: 50 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p).toEqual({
      rate: (8 / 12) * 100,
      num: 8,
      den: 12,
      samples: 18,
      level: 1,
      matched: { day: true, demand: true, lead: false },
    });
  });

  it('level 2: drops demand, keeping (day, time, direction, lead)', () => {
    const rows = [
      // same day + lead, different demand
      row({ demandBucket: '30+', completed: 9, refunded: 1, total: 12 }),
      // decoy: same day but neither demand nor lead — level 3 only
      row({ demandBucket: '0-5', bucket: '6m+', completed: 0, refunded: 50, total: 50 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p).toEqual({
      rate: 90,
      num: 9,
      den: 10,
      samples: 12,
      level: 2,
      matched: { day: true, demand: false, lead: true },
    });
  });

  it('level 3: day only (neither demand nor lead has history)', () => {
    const rows = [
      row({ demandBucket: '30+', bucket: '6m+', completed: 4, refunded: 4, total: 20 }),
      row({ dayOfWeek: 'Friday', completed: 0, refunded: 50, total: 50 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p).toEqual({
      rate: 50,
      num: 4,
      den: 8,
      samples: 20,
      level: 3,
      matched: { day: true, demand: false, lead: false },
    });
  });

  it('level 4: drops the day too, keeping (time, direction)', () => {
    const rows = [
      row({
        dayOfWeek: 'Friday',
        demandBucket: '0-5',
        bucket: '2w',
        completed: 9,
        refunded: 1,
        total: 25,
      }),
      row({ time: '17:30:00', completed: 0, refunded: 50, total: 50 }),
      row({ direction: 'JToW', completed: 0, refunded: 50, total: 50 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p).toEqual({
      rate: 90,
      num: 9,
      den: 10,
      samples: 25,
      level: 4,
      matched: { day: false, demand: false, lead: false },
    });
  });

  it('a level resolves only when its cell has resolved bookings', () => {
    const rows = [
      // exact cell exists but nothing resolved → keep falling back; its
      // unresolved bookings still count as samples at the level that resolves
      row({ completed: 0, refunded: 0, cancelled: 4, total: 4 }),
      row({ bucket: '2w', completed: 5, refunded: 5, total: 10 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p?.level).toBe(1);
    expect(p?.rate).toBe(50);
    expect(p?.samples).toBe(14);
  });

  it('null when even (time, direction) has no resolved bookings', () => {
    const rows = [
      row({ time: '17:30:00', completed: 10, refunded: 0 }),
      row({ direction: 'JToW', completed: 10, refunded: 0 }),
      row({ completed: 0, refunded: 0, cancelled: 3, total: 3 }),
    ];
    expect(predictOdds(rows, ctx)).toBeNull();
  });

  it('null on no data at all', () => {
    expect(predictOdds([], ctx)).toBeNull();
  });
});

describe('oddsConfidence = min(dimension score, sample score)', () => {
  function p(level: OddsPrediction['level'], den: number): OddsPrediction {
    const matched = {
      day: level <= 3,
      demand: level === 0 || level === 1,
      lead: level === 0 || level === 2,
    };
    return { rate: 50, num: den / 2, den, samples: den, level, matched };
  }

  it('exposes the named thresholds', () => {
    expect(SAMPLE_HIGH_MIN).toBe(50);
    expect(SAMPLE_MEDIUM_MIN).toBe(15);
  });

  // dims 3 (levels 0–1: day + demand matched; lead optional) × each sample score
  it('dims 3 + samples 3 → high (levels 0-1, den >= 50)', () => {
    expect(oddsConfidence(p(0, 50))).toBe('high');
    expect(oddsConfidence(p(0, 60))).toBe('high');
    expect(oddsConfidence(p(0, 1000))).toBe('high');
    // L1 (day + demand matched, lead not) earns full dims score too — demand
    // is the dominant signal and prod L0 cells almost never reach 50 resolved
    expect(oddsConfidence(p(1, 50))).toBe('high');
    expect(oddsConfidence(p(1, 200))).toBe('high');
  });

  it('dims 3 + samples 2 → medium (levels 0-1, 15 <= den < 50)', () => {
    expect(oddsConfidence(p(0, 15))).toBe('medium');
    expect(oddsConfidence(p(0, 30))).toBe('medium');
    expect(oddsConfidence(p(0, 49))).toBe('medium');
    expect(oddsConfidence(p(1, 15))).toBe('medium');
    expect(oddsConfidence(p(1, 49))).toBe('medium');
  });

  it('dims 3 + samples 1 → low (levels 0-1, den < 15 — sample size caps a full match)', () => {
    expect(oddsConfidence(p(0, 14))).toBe('low');
    expect(oddsConfidence(p(0, 8))).toBe('low');
    expect(oddsConfidence(p(0, 1))).toBe('low');
    expect(oddsConfidence(p(1, 14))).toBe('low');
  });

  // dims 2 (level 2: day + lead, demand unmatched) × each sample score
  it('dims 2 + samples 3 → medium (dims cap, level 2 with den >= 50)', () => {
    expect(oddsConfidence(p(2, 50))).toBe('medium');
    expect(oddsConfidence(p(2, 500))).toBe('medium');
  });

  it('dims 2 + samples 2 → medium (level 2, 15 <= den < 50)', () => {
    expect(oddsConfidence(p(2, 15))).toBe('medium');
    expect(oddsConfidence(p(2, 49))).toBe('medium');
  });

  it('dims 2 + samples 1 → low (level 2, den < 15)', () => {
    expect(oddsConfidence(p(2, 14))).toBe('low');
    expect(oddsConfidence(p(2, 3))).toBe('low');
  });

  // dims 1 (levels 3–4) × each sample score
  it('dims 1 → low regardless of sample score (levels 3-4)', () => {
    expect(oddsConfidence(p(3, 500))).toBe('low'); // samples 3
    expect(oddsConfidence(p(3, 20))).toBe('low'); // samples 2
    expect(oddsConfidence(p(3, 5))).toBe('low'); // samples 1
    expect(oddsConfidence(p(4, 500))).toBe('low');
    expect(oddsConfidence(p(4, 20))).toBe('low');
    expect(oddsConfidence(p(4, 5))).toBe('low');
  });

  // both boundaries at the levels where each matters
  it('boundary 14/15: low → medium at levels 0-1', () => {
    expect(oddsConfidence(p(0, 14))).toBe('low');
    expect(oddsConfidence(p(0, 15))).toBe('medium');
    expect(oddsConfidence(p(1, 14))).toBe('low');
    expect(oddsConfidence(p(1, 15))).toBe('medium');
  });

  it('boundary 49/50: medium → high at levels 0-1', () => {
    expect(oddsConfidence(p(0, 49))).toBe('medium');
    expect(oddsConfidence(p(0, 50))).toBe('high');
    expect(oddsConfidence(p(1, 49))).toBe('medium');
    expect(oddsConfidence(p(1, 50))).toBe('high');
  });

  it('end-to-end: predictOdds + oddsConfidence on an exact 50-sample cell', () => {
    const pred = predictOdds([row({ completed: 40, refunded: 10, total: 50 })], ctx);
    expect(pred).not.toBeNull();
    expect(oddsConfidence(pred!)).toBe('high');
  });

  it('end-to-end: an exact cell with only 8 resolved bookings is low', () => {
    const pred = predictOdds([row({ completed: 6, refunded: 2, total: 8 })], ctx);
    expect(pred?.level).toBe(0);
    expect(oddsConfidence(pred!)).toBe('low');
  });

  it('end-to-end: a level-1 cell (day + demand, lead unmatched) with 50 resolved is high', () => {
    const pred = predictOdds([row({ bucket: '2w', completed: 40, refunded: 10, total: 50 })], ctx);
    expect(pred?.level).toBe(1);
    expect(pred?.matched).toEqual({ day: true, demand: true, lead: false });
    expect(oddsConfidence(pred!)).toBe('high');
  });
});

describe('oddsClass thresholds', () => {
  it('green at or above 70', () => {
    expect(oddsClass(70)).toBe('bg-green-500');
    expect(oddsClass(100)).toBe('bg-green-500');
  });
  it('amber between 40 and 70', () => {
    expect(oddsClass(40)).toBe('bg-amber-500');
    expect(oddsClass(69.9)).toBe('bg-amber-500');
  });
  it('red below 40', () => {
    expect(oddsClass(39.9)).toBe('bg-red-500');
    expect(oddsClass(0)).toBe('bg-red-500');
  });
});
