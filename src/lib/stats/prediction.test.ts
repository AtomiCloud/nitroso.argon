import { describe, expect, it } from 'vitest';
import type { BookingStatRes } from '$lib/api/core/data-contracts';
import { oddsClass, predictOdds } from './prediction';

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

const ctx = { dayOfWeek: 'Monday', time: '08:00:00', direction: 'WToJ', demandBucket: '5-10' };

describe('predictOdds fallback chain', () => {
  it('level 0: exact (day, time, direction, demand) cell', () => {
    const rows = [
      row({ completed: 20, refunded: 5 }),
      // decoys that must NOT contaminate the exact cell
      row({ demandBucket: '30+', completed: 0, refunded: 50 }),
      row({ dayOfWeek: 'Friday', completed: 0, refunded: 50 }),
      row({ direction: 'JToW', completed: 0, refunded: 50 }),
      row({ time: '17:30:00', completed: 0, refunded: 50 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p).toEqual({ rate: 80, num: 20, den: 25, level: 0 });
  });

  it('cancellations do not enter the refund-only denominator', () => {
    const p = predictOdds([row({ completed: 3, refunded: 1, cancelled: 96 })], ctx);
    expect(p).toEqual({ rate: 75, num: 3, den: 4, level: 0 });
  });

  it('level 1: drops the demand match when the exact cell is empty', () => {
    const rows = [
      row({ demandBucket: '30+', completed: 6, refunded: 2 }),
      row({ demandBucket: '0-5', completed: 2, refunded: 2 }),
      row({ dayOfWeek: 'Friday', completed: 0, refunded: 50 }),
    ];
    const p = predictOdds(rows, ctx);
    // (6+2) / (6+2+2+2) over Monday 08:00 WToJ, any demand
    expect(p).toEqual({ rate: (8 / 12) * 100, num: 8, den: 12, level: 1 });
  });

  it('level 1 also applies when the exact cell exists but nothing resolved', () => {
    const rows = [
      row({ completed: 0, refunded: 0, cancelled: 4, total: 4 }),
      row({ demandBucket: '30+', completed: 5, refunded: 5 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p?.level).toBe(1);
    expect(p?.rate).toBe(50);
  });

  it('level 2: drops the day too, keeping (time, direction)', () => {
    const rows = [
      row({ dayOfWeek: 'Friday', demandBucket: '0-5', completed: 9, refunded: 1 }),
      row({ time: '17:30:00', completed: 0, refunded: 50 }),
      row({ direction: 'JToW', completed: 0, refunded: 50 }),
    ];
    const p = predictOdds(rows, ctx);
    expect(p).toEqual({ rate: 90, num: 9, den: 10, level: 2 });
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
