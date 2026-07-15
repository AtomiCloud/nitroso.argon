import type { WithdrawalPrincipalRes } from '$lib/api/core/data-contracts';

/**
 * Page size for the withdrawals list (admin + wallet owner views).
 *
 * 20 keeps a long history list scannable on one screen; matches the
 * bookings list convention.
 */
export const WITHDRAWAL_PAGE_SIZE = 20;

/**
 * Hard cap on rows we ask zinc for in a single GET Withdrawal call.
 *
 * The list endpoint supports `Limit`; the matrix says pagination
 * deserves client-side slicing, but pagination alone is useless
 * without search, and the endpoint has no username/email/confirmation
 * filter. Pull everything once (up to this many rows) so we can
 * match against fields the row actually carries. 1000 is well above
 * the realistic admin volume — one admin scan-month typically fits
 * in under a hundred — and stays small enough to avoid surprising
 * the user with a multi-megabyte payload.
 */
export const WITHDRAWAL_FETCH_LIMIT = 1000;

/**
 * Whether a single withdrawal row matches the user-typed search term.
 *
 * The list endpoint returns `WithdrawalPrincipalRes` rows without the
 * owning `User`, so we can only filter against row-local fields:
 *   - withdrawal id (UUID substring)
 *   - PayNow number (8-digit string; for PayNow records)
 *   - payout confirmation number (for PayNow + manual completes)
 *   - amount (as a plain numeric string, so "10" matches $10 rows)
 *
 * Username / email are intentionally NOT searched here — they would
 * require an API change to surface on the list response, and we're
 * scoped to the list view.
 *
 * Matching is case-insensitive substring. A blank/whitespace search
 * term matches everything (no filter). Inputs are NOT trimmed: the
 * caller decides.
 */
export function withdrawalMatchesSearch(row: WithdrawalPrincipalRes, search: string): boolean {
  const trimmed = search.trim();
  if (trimmed.length === 0) return true;
  const needle = trimmed.toLowerCase();

  if (row.id != null && row.id.toLowerCase().includes(needle)) return true;

  const payNow = row.record?.payNowNumber;
  if (payNow != null && payNow.toLowerCase().includes(needle)) return true;

  const confirmation = row.payout?.confirmationNumber;
  if (confirmation != null && confirmation.toLowerCase().includes(needle)) {
    return true;
  }

  // amount can be a fraction (e.g. "10.50") — compare both the raw
  // string and the integer portion so typing "10" still matches $10
  if (typeof row.record?.amount === 'number') {
    const amountString = `${row.record.amount}`;
    if (amountString.toLowerCase().includes(needle)) return true;
  }

  return false;
}

/**
 * Slice a row array for the requested (1-indexed) page at `pageSize`.
 *
 * `page` must be a positive integer; out-of-range pages return an
 * empty array (the caller renders the "no results on this page"
 * state). Inputs are typed loosely so the caller doesn't have to
 * pre-validate `page` from a query string.
 */
export function paginateWithdrawals<T>(rows: T[], page: number, pageSize: number): T[] {
  if (!Number.isFinite(page) || page < 1) return [];
  if (!Number.isFinite(pageSize) || pageSize < 1) return [];
  const start = (page - 1) * pageSize;
  if (start >= rows.length) return [];
  return rows.slice(start, start + pageSize);
}

/**
 * Total page count for a result set at the given page size.
 *
 * Empty sets render as a single empty page (so "Page 1 of 1" stays
 * truthful), matching how svelte-i18n's "pageOf" reads.
 */
export function totalPages(rows: unknown[] | { length: number }, pageSize: number): number {
  const len = rows?.length ?? 0;
  if (!Number.isFinite(pageSize) || pageSize < 1) return 1;
  return Math.max(1, Math.ceil(len / pageSize));
}
