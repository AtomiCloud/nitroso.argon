import { describe, expect, it } from 'vitest';
import { priceQuote, samePriceQuote } from './cost';

describe('live price quote comparison', () => {
  it('accepts the exact same server quote', () => {
    expect(samePriceQuote('15', '15')).toBe(true);
    expect(samePriceQuote('15', '15.01')).toBe(false);
  });

  it('detects a valid sub-cent change', () => {
    expect(samePriceQuote('13.2563635034720316', '13.256363503472032')).toBe(false);
  });

  it('rejects invalid values', () => {
    expect(samePriceQuote('', '')).toBe(false);
    expect(samePriceQuote(undefined, '15')).toBe(false);
    expect(samePriceQuote(15, '15')).toBe(false);
  });
});

describe('price quote rollout', () => {
  it('prefers the exact server token over the rounded JSON number', () => {
    expect(priceQuote({ final: 13.256363503472032, quote: '13.2563635034720316' })).toBe('13.2563635034720316');
  });

  it('keeps working against Zinc versions without a quote token', () => {
    expect(priceQuote({ final: 15, quote: undefined })).toBe('15');
    expect(priceQuote({ final: Number.NaN, quote: undefined })).toBe('');
  });
});
