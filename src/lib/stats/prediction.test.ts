import { describe, expect, it } from 'vitest';
import type { BookingStatRes } from '$lib/api/core/data-contracts';
import { oddsClass, oddsConfidence, predictOdds, type OddsPrediction } from './prediction';

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
      row({ completed: 20, refunded: 5 }),
      // decoys that must NOT contaminate the exact cell
      row({ demandBucket: '30+', completed: 0, refunded: 50 }),
      row({ bucket: '2w', completed: 0, refunded: 50 }),
      row({ dayOfWeek: 'Friday', completed: 0, refunded: 50 }),
      row({ direction: 'JToW', completed: 0, refunded: 50 }),
      row({ time: '17:30:00', completed: 0, refunded: 50 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p).toEqual({
      rate: 80,
      num: 20,
      den: 25,
      level: 0,
      matched: { day: true, demand: true, lead: true },
    });
  });

  it('cancellations do not enter the refund-only denominator', () => {
    const p = predictOdds([row({ completed: 3, refunded: 1, cancelled: 96 })], ctx);
    expect(p?.rate).toBe(75);
    expect(p?.den).toBe(4);
    expect(p?.level).toBe(0);
  });

  it('level 1: drops the lead match when the exact cell is empty', () => {
    const rows = [
      // same day + demand, different lead buckets
      row({ bucket: '2w', completed: 6, refunded: 2 }),
      row({ bucket: '6h', completed: 2, refunded: 2 }),
      // decoy: matching lead but wrong demand must not resolve first
      row({ demandBucket: '30+', completed: 0, refunded: 50 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p).toEqual({
      rate: (8 / 12) * 100,
      num: 8,
      den: 12,
      level: 1,
      matched: { day: true, demand: true, lead: false },
    });
  });

  it('level 2: drops demand, keeping (day, time, direction, lead)', () => {
    const rows = [
      // same day + lead, different demand
      row({ demandBucket: '30+', completed: 9, refunded: 1 }),
      // decoy: same day but neither demand nor lead — level 3 only
      row({ demandBucket: '0-5', bucket: '6m+', completed: 0, refunded: 50 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p).toEqual({
      rate: 90,
      num: 9,
      den: 10,
      level: 2,
      matched: { day: true, demand: false, lead: true },
    });
  });

  it('level 3: day only (neither demand nor lead has history)', () => {
    const rows = [
      row({ demandBucket: '30+', bucket: '6m+', completed: 4, refunded: 4 }),
      row({ dayOfWeek: 'Friday', completed: 0, refunded: 50 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p).toEqual({
      rate: 50,
      num: 4,
      den: 8,
      level: 3,
      matched: { day: true, demand: false, lead: false },
    });
  });

  it('level 4: drops the day too, keeping (time, direction)', () => {
    const rows = [
      row({ dayOfWeek: 'Friday', demandBucket: '0-5', bucket: '2w', completed: 9, refunded: 1 }),
      row({ time: '17:30:00', completed: 0, refunded: 50 }),
      row({ direction: 'JToW', completed: 0, refunded: 50 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p).toEqual({
      rate: 90,
      num: 9,
      den: 10,
      level: 4,
      matched: { day: false, demand: false, lead: false },
    });
  });

  it('a level resolves only when its cell has resolved bookings', () => {
    const rows = [
      // exact cell exists but nothing resolved → keep falling back
      row({ completed: 0, refunded: 0, cancelled: 4, total: 4 }),
      row({ bucket: '2w', completed: 5, refunded: 5 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p?.level).toBe(1);
    expect(p?.rate).toBe(50);
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

describe('oddsConfidence', () => {
  function p(level: OddsPrediction['level'], den: number, matched: OddsPrediction['matched']): OddsPrediction {
    return { rate: 50, num: den / 2, den, level, matched };
  }
  const all = { day: true, demand: true, lead: true };

  it('high: level 0 with den >= 20', () => {
    expect(oddsConfidence(p(0, 20, all))).toBe('high');
    expect(oddsConfidence(p(0, 100, all))).toBe('high');
  });

  it('medium: level 0 with den < 20 (thin exact sample)', () => {
    expect(oddsConfidence(p(0, 19, all))).toBe('medium');
    expect(oddsConfidence(p(0, 1, all))).toBe('medium');
  });

  it('medium: level 1 (demand matched, lead dropped) regardless of den', () => {
    expect(oddsConfidence(p(1, 500, { day: true, demand: true, lead: false }))).toBe('medium');
    expect(oddsConfidence(p(1, 3, { day: true, demand: true, lead: false }))).toBe('medium');
  });

  it('medium: level 2 (lead matched, demand dropped) regardless of den', () => {
    expect(oddsConfidence(p(2, 500, { day: true, demand: false, lead: true }))).toBe('medium');
    expect(oddsConfidence(p(2, 3, { day: true, demand: false, lead: true }))).toBe('medium');
  });

  it('low: level 3 (day/time/direction only) regardless of den', () => {
    expect(oddsConfidence(p(3, 500, { day: true, demand: false, lead: false }))).toBe('low');
  });

  it('low: level 4 (time/direction only)', () => {
    expect(oddsConfidence(p(4, 500, { day: false, demand: false, lead: false }))).toBe('low');
  });

  it('end-to-end: predictOdds + oddsConfidence on an exact 20-sample cell', () => {
    const pred = predictOdds([row({ completed: 15, refunded: 5 })], ctx);
    expect(pred).not.toBeNull();
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
