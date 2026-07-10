import { describe, expect, it } from 'vitest';
import { sameQuotedPrice } from './cost';

describe('live price quote comparison', () => {
  it('compares at the cent precision charged and displayed', () => {
    expect(sameQuotedPrice(15, 15)).toBe(true);
    expect(sameQuotedPrice(15.1, 15.099999999)).toBe(true);
    expect(sameQuotedPrice(15, 15.01)).toBe(false);
  });

  it('rejects invalid values', () => {
    expect(sameQuotedPrice(Number.NaN, 15)).toBe(false);
    expect(sameQuotedPrice(15, Number.POSITIVE_INFINITY)).toBe(false);
  });
});
