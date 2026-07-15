import { describe, expect, it } from 'vitest';
import { HISTORY_GATE_CUTOFF_MONTH, HISTORY_GATE_CUTOFF_YEAR, isBeforeHistoryGate } from './history-gate-note';

describe('isBeforeHistoryGate', () => {
  it('flags months before June 2026', () => {
    // sanity-check the constants so future drift is caught here too —
    // bumping them silently breaks the hint on every page
    expect(HISTORY_GATE_CUTOFF_YEAR).toBe(2026);
    expect(HISTORY_GATE_CUTOFF_MONTH).toBe(6);

    expect(isBeforeHistoryGate({ year: 2025, month: 12 })).toBe(true);
    expect(isBeforeHistoryGate({ year: 2026, month: 1 })).toBe(true);
    expect(isBeforeHistoryGate({ year: 2026, month: 5 })).toBe(true);
  });

  it('does NOT flag months on or after the cutoff', () => {
    // June 2026 is the first fully-visible month for non-owners; showing
    // the note at exactly that point would be wrong (the data is in)
    expect(isBeforeHistoryGate({ year: 2026, month: 6 })).toBe(false);
    expect(isBeforeHistoryGate({ year: 2026, month: 7 })).toBe(false);
    expect(isBeforeHistoryGate({ year: 2027, month: 1 })).toBe(false);
  });

  it('returns false when no range is picked yet', () => {
    // the admin hasn't asked to see anything; the note would be
    // premature and confusing
    expect(isBeforeHistoryGate(null)).toBe(false);
    expect(isBeforeHistoryGate(undefined)).toBe(false);
  });
});
