import { describe, expect, it } from 'vitest';
import { toSlotCount } from './typing';

describe('toSlotCount', () => {
  it('maps a full new-zinc row into total + split', () => {
    expect(toSlotCount({ ticketsNeeded: 15, priority: 3, normal: 12 })).toEqual({
      total: 15,
      priority: 3,
      normal: 12,
    });
  });

  it('keeps a zero split (0 priority is a real value, not absence)', () => {
    expect(toSlotCount({ ticketsNeeded: 12, priority: 0, normal: 12 })).toEqual({
      total: 12,
      priority: 0,
      normal: 12,
    });
  });

  it('falls back to total-only on old-zinc rows without the split', () => {
    expect(toSlotCount({ ticketsNeeded: 7 })).toEqual({ total: 7, priority: null, normal: null });
  });

  it('drops a half-present split', () => {
    expect(toSlotCount({ ticketsNeeded: 7, priority: 2 })).toEqual({ total: 7, priority: null, normal: null });
    expect(toSlotCount({ ticketsNeeded: 7, normal: 5 })).toEqual({ total: 7, priority: null, normal: null });
  });

  it('drops a split that does not add up to the total', () => {
    expect(toSlotCount({ ticketsNeeded: 7, priority: 2, normal: 3 })).toEqual({
      total: 7,
      priority: null,
      normal: null,
    });
  });

  it('a missing row is an empty slot', () => {
    expect(toSlotCount(undefined)).toEqual({ total: 0, priority: null, normal: null });
  });
});
