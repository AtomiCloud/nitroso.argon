import { describe, expect, it } from 'vitest';
import { ktmbFxDraftToReq, validateKtmbFxDraft } from './ktmb-fx';

const NOW = new Date('2026-07-10T12:00:00Z');

describe('validateKtmbFxDraft', () => {
  it('accepts a clean immediate rate', () => {
    expect(validateKtmbFxDraft({ rate: '0.3', effectiveAt: '' }, NOW)).toEqual({});
    expect(validateKtmbFxDraft({ rate: '0.285714', effectiveAt: '' }, NOW)).toEqual({});
    expect(validateKtmbFxDraft({ rate: '1', effectiveAt: '' }, NOW)).toEqual({});
  });

  it('rejects non-positive, out-of-range, imprecise or non-numeric rates', () => {
    for (const rate of ['', '0', '-1', '1000.01', '0.1234567', 'abc', 'Infinity']) {
      expect(validateKtmbFxDraft({ rate, effectiveAt: '' }, NOW).rate).toBe('rateRange');
    }
  });

  it('accepts a future effectiveAt and rejects past/invalid ones', () => {
    expect(validateKtmbFxDraft({ rate: '0.3', effectiveAt: '2026-07-11T09:00' }, NOW)).toEqual({});
    expect(validateKtmbFxDraft({ rate: '0.3', effectiveAt: '2026-07-09T09:00' }, NOW).effectiveAt).toBe(
      'effectivePast',
    );
    expect(validateKtmbFxDraft({ rate: '0.3', effectiveAt: 'garbage' }, NOW).effectiveAt).toBe('effectiveInvalid');
  });
});

describe('ktmbFxDraftToReq', () => {
  it('parses the rate and nulls an empty effectiveAt (immediate)', () => {
    expect(ktmbFxDraftToReq({ rate: ' 0.3 ', effectiveAt: '' })).toEqual({
      rate: 0.3,
      effectiveAt: null,
    });
  });

  it('converts a datetime-local value to a UTC ISO instant', () => {
    const req = ktmbFxDraftToReq({ rate: '0.3', effectiveAt: '2026-07-11T09:00' });
    // datetime-local is read in the runtime's local zone; the wire value must
    // be the equivalent UTC instant
    expect(req.effectiveAt).toBe(new Date('2026-07-11T09:00').toISOString());
  });
});
