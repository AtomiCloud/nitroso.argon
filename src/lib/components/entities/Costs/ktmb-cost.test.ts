import { describe, expect, it } from 'vitest';
import { currentRows, ktmbDraftToReq, validateKtmbDraft } from './ktmb-cost';

const NOW = new Date('2026-07-10T12:00:00Z');

describe('validateKtmbDraft', () => {
  it('accepts a clean immediate change', () => {
    expect(validateKtmbDraft({ direction: 'JToW', cost: '5', effectiveAt: '' }, NOW)).toEqual({});
    expect(validateKtmbDraft({ direction: 'WToJ', cost: '0', effectiveAt: '' }, NOW)).toEqual({});
    expect(validateKtmbDraft({ direction: 'WToJ', cost: '10000', effectiveAt: '' }, NOW)).toEqual({});
    expect(validateKtmbDraft({ direction: 'WToJ', cost: '5.25', effectiveAt: '' }, NOW)).toEqual({});
  });

  it('requires a known direction', () => {
    expect(validateKtmbDraft({ direction: '', cost: '5', effectiveAt: '' }, NOW).direction).toBe('directionRequired');
    expect(validateKtmbDraft({ direction: 'Sideways', cost: '5', effectiveAt: '' }, NOW).direction).toBe(
      'directionRequired',
    );
  });

  it('rejects out-of-range, imprecise or non-numeric costs', () => {
    for (const cost of ['', '-1', '10000.01', '5.123', 'abc', 'Infinity']) {
      expect(validateKtmbDraft({ direction: 'JToW', cost, effectiveAt: '' }, NOW).cost).toBe('costRange');
    }
  });

  it('accepts a future effectiveAt and rejects past/invalid ones', () => {
    expect(validateKtmbDraft({ direction: 'JToW', cost: '5', effectiveAt: '2026-07-11T09:00' }, NOW)).toEqual({});
    expect(validateKtmbDraft({ direction: 'JToW', cost: '5', effectiveAt: '2026-07-09T09:00' }, NOW).effectiveAt).toBe(
      'effectivePast',
    );
    expect(validateKtmbDraft({ direction: 'JToW', cost: '5', effectiveAt: 'garbage' }, NOW).effectiveAt).toBe(
      'effectiveInvalid',
    );
  });
});

describe('ktmbDraftToReq', () => {
  it('parses the cost and nulls an empty effectiveAt (immediate)', () => {
    expect(ktmbDraftToReq({ direction: 'JToW', cost: ' 5.25 ', effectiveAt: '' })).toEqual({
      direction: 'JToW',
      cost: 5.25,
      effectiveAt: null,
    });
  });

  it('converts a datetime-local value to a UTC ISO instant', () => {
    const req = ktmbDraftToReq({ direction: 'WToJ', cost: '5', effectiveAt: '2026-07-11T09:00' });
    // datetime-local is read in the runtime's local zone; the wire value must
    // be the equivalent UTC instant
    expect(req.effectiveAt).toBe(new Date('2026-07-11T09:00').toISOString());
  });
});

describe('currentRows', () => {
  const DIRS = ['WToJ', 'JToW'];

  it('always yields both directions in canonical order', () => {
    const rows = currentRows({ current: { JToW: 5, WToJ: 4.5 } }, DIRS);
    expect(rows).toEqual([
      { direction: 'WToJ', cost: 4.5 },
      { direction: 'JToW', cost: 5 },
    ]);
  });

  it('marks a never-configured direction as null (not 0)', () => {
    const rows = currentRows({ current: { JToW: 5 } }, DIRS);
    expect(rows).toEqual([
      { direction: 'WToJ', cost: null },
      { direction: 'JToW', cost: 5 },
    ]);
  });

  it('keeps an explicitly configured 0 distinct from unconfigured', () => {
    const rows = currentRows({ current: { WToJ: 0 } }, DIRS);
    expect(rows[0]).toEqual({ direction: 'WToJ', cost: 0 });
    expect(rows[1]).toEqual({ direction: 'JToW', cost: null });
  });
});
