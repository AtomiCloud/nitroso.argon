// Pure helper for the owner-gated history hint shown on /analysis, /pnl and
// /partners when the picked range starts before June 2026. The note itself
// is purely range-triggered — we never inspect roles client-side because the
// server is the only place that knows whether the request lacks the
// 'owner' role; the UI just hints that pre-June history may look empty.
//
// Mirror the @internationalized/date DateValue shape so callers can pass
// either a DateValue from the range picker or a plain {year, month} (the
// shape `lastDayOfMonth` and friends already use). Month is 1-indexed to
// match DateValue (January = 1).

/** First month (inclusive) the server returns data for without the owner
 *  role. Picked months before this may show empty for non-owners — that's
 *  the server clamping, not a bug. */
export const HISTORY_GATE_CUTOFF_YEAR = 2026;
export const HISTORY_GATE_CUTOFF_MONTH = 6; // June

/** Minimal date shape we accept. DateValue from @internationalized/date
 *  matches this exactly; passing a plain `{ year, month }` also works
 *  (used by URL-seeded ranges that may not be DateValues at all). */
export interface YearMonth {
  year: number;
  month: number;
}

/** Does the picked range start before the June 2026 gate? A null/undefined
 *  `from` returns false (no range picked yet — the admin hasn't asked to
 *  see history, so the note would be premature). Months on or after the
 *  cutoff return false (the gate doesn't apply to them). */
export function isBeforeHistoryGate(from: YearMonth | null | undefined): boolean {
  if (from == null) return false;
  if (from.year < HISTORY_GATE_CUTOFF_YEAR) return true;
  if (from.year > HISTORY_GATE_CUTOFF_YEAR) return false;
  return from.month < HISTORY_GATE_CUTOFF_MONTH;
}
