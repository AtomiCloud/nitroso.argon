import { describe, expect, it } from 'vitest';
import { sameQuotedPrice } from './cost';

describe('live price quote comparison', () => {
  it('accepts the exact same server quote', () => {
    expect(sameQuotedPrice(15, 15)).toBe(true);
    expect(sameQuotedPrice(15, 15.01)).toBe(false);
  });

  it('detects a valid sub-cent change', () => {
    expect(sameQuotedPrice(1.004, 1.005)).toBe(false);
  });

  it('rejects invalid values', () => {
    expect(sameQuotedPrice(Number.NaN, 15)).toBe(false);
    expect(sameQuotedPrice(15, Number.POSITIVE_INFINITY)).toBe(false);
  });
});
