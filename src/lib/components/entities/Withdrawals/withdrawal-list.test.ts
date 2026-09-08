import { describe, it, expect, beforeAll } from 'vitest';
import { waitLocale } from 'svelte-i18n';
import type { WithdrawalPrincipalRes } from '$lib/api/core/data-contracts';
import {
  WITHDRAWAL_FETCH_LIMIT,
  WITHDRAWAL_PAGE_SIZE,
  pageFromParam,
  paginateWithdrawals,
  totalPages,
  withdrawalMatchesSearch,
} from './withdrawal-list';

// Vitest pulls in `$lib/i18n` for some neighboring modules; warm all
// three dictionaries so tests that exercise locale-tagged paths don't
// race the catalog loader.
beforeAll(async () => {
  await Promise.all([waitLocale('en'), waitLocale('zh'), waitLocale('ms')]);
});

function makeRow(overrides: Partial<WithdrawalPrincipalRes> = {}): WithdrawalPrincipalRes {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    createAt: '2025-01-01T00:00:00Z',
    status: { status: 'Pending' },
    record: { amount: 10, payNowNumber: null, method: 'PayNow' },
    complete: { completedAt: '', note: null, receipt: null },
    ...overrides,
  } as WithdrawalPrincipalRes;
}

describe('WITHDRAWAL_PAGE_SIZE', () => {
  it('is the documented 20 rows per page', () => {
    expect(WITHDRAWAL_PAGE_SIZE).toBe(20);
  });

  it('WITHDRAWAL_FETCH_LIMIT is a positive integer larger than PAGE_SIZE', () => {
    expect(WITHDRAWAL_FETCH_LIMIT).toBeGreaterThan(WITHDRAWAL_PAGE_SIZE);
    expect(Number.isInteger(WITHDRAWAL_FETCH_LIMIT)).toBe(true);
  });
});

describe('pageFromParam', () => {
  it('reads a well-formed page number', () => {
    expect(pageFromParam('1')).toBe(1);
    expect(pageFromParam('2')).toBe(2);
    expect(pageFromParam('137')).toBe(137);
  });

  it('defaults to page 1 when the param is absent or blank', () => {
    expect(pageFromParam(null)).toBe(1);
    expect(pageFromParam(undefined)).toBe(1);
    expect(pageFromParam('')).toBe(1);
    expect(pageFromParam('   ')).toBe(1);
  });

  it('defaults to page 1 for non-positive and non-integer values', () => {
    expect(pageFromParam('0')).toBe(1);
    expect(pageFromParam('-3')).toBe(1);
    expect(pageFromParam('1.5')).toBe(1);
    expect(pageFromParam('Infinity')).toBe(1);
    expect(pageFromParam('NaN')).toBe(1);
  });

  it('rejects partially-numeric junk rather than reading a prefix', () => {
    // parseInt would have read "3abc" as 3; a page number is a whole
    // number or it is nonsense.
    expect(pageFromParam('3abc')).toBe(1);
    expect(pageFromParam('abc')).toBe(1);
    expect(pageFromParam('1e3')).toBe(1000); // Number() accepts exponent form
  });

  it('round-trips the page a deep link would carry', () => {
    const url = new URL('https://x/withdrawals?status=Pending&page=4');
    expect(pageFromParam(url.searchParams.get('page'))).toBe(4);
  });

  it('feeds paginateWithdrawals directly — a junk param shows page 1, not an empty list', () => {
    const rows = Array.from({ length: 45 }, (_, i) => i);
    const page = pageFromParam('garbage');
    expect(paginateWithdrawals(rows, page, WITHDRAWAL_PAGE_SIZE)).toEqual(rows.slice(0, 20));
  });
});

describe('withdrawalMatchesSearch', () => {
  it('matches everything when the search term is empty or whitespace', () => {
    const row = makeRow();
    expect(withdrawalMatchesSearch(row, '')).toBe(true);
    expect(withdrawalMatchesSearch(row, '   ')).toBe(true);
  });

  it('matches by withdrawal id substring (case-insensitive)', () => {
    const row = makeRow({ id: 'aaaaBBBB-cccc-DDDD-eeee-ffffFFFFffff' });
    expect(withdrawalMatchesSearch(row, 'bbbb')).toBe(true);
    expect(withdrawalMatchesSearch(row, 'FFFF')).toBe(true);
    expect(withdrawalMatchesSearch(row, 'no-match-here')).toBe(false);
  });

  it('matches by PayNow number for PayNow rows', () => {
    const row = makeRow({ record: { amount: 10, payNowNumber: '91234567', method: 'PayNow' } });
    expect(withdrawalMatchesSearch(row, '9123')).toBe(true);
    expect(withdrawalMatchesSearch(row, '9999')).toBe(false);
  });

  it('matches by payout confirmation number when present', () => {
    const row = makeRow({ payout: { fee: 0, reconcileAttempts: 0, confirmationNumber: 'CONF-ABC-123' } });
    expect(withdrawalMatchesSearch(row, 'abc')).toBe(true);
    expect(withdrawalMatchesSearch(row, 'CONF')).toBe(true);
    expect(withdrawalMatchesSearch(row, 'XYZ')).toBe(false);
  });

  it('matches by the row amount as a numeric string', () => {
    const row = makeRow({ record: { amount: 12.5, payNowNumber: null, method: 'CardRefund' } });
    expect(withdrawalMatchesSearch(row, '12')).toBe(true);
    expect(withdrawalMatchesSearch(row, '12.5')).toBe(true);
    expect(withdrawalMatchesSearch(row, '999')).toBe(false);
  });

  it('returns false when no field matches', () => {
    const row = makeRow({ id: 'zzz', record: { amount: 1, payNowNumber: null, method: 'PayNow' } });
    expect(withdrawalMatchesSearch(row, 'xyz')).toBe(false);
  });

  it('treats a missing confirmation number as no-match rather than throwing', () => {
    const row = makeRow({ payout: { fee: 0, reconcileAttempts: 0 } });
    expect(withdrawalMatchesSearch(row, 'anything')).toBe(false);
  });
});

describe('paginateWithdrawals', () => {
  const rows = Array.from({ length: 25 }, (_ignored, i) => makeRow({ id: `row-${String(i + 1).padStart(2, '0')}` }));

  it('returns the first 20 rows on page 1 of a 25-row set with pageSize 20', () => {
    const out = paginateWithdrawals(rows, 1, 20);
    expect(out).toHaveLength(20);
    expect(out[0].id).toBe('row-01');
    expect(out[19].id).toBe('row-20');
  });

  it('returns the trailing 5 rows on page 2', () => {
    const out = paginateWithdrawals(rows, 2, 20);
    expect(out).toHaveLength(5);
    expect(out[0].id).toBe('row-21');
    expect(out[4].id).toBe('row-25');
  });

  it('returns an empty array for an out-of-range page', () => {
    expect(paginateWithdrawals(rows, 99, 20)).toEqual([]);
  });

  it('returns an empty array for non-positive page numbers', () => {
    expect(paginateWithdrawals(rows, 0, 20)).toEqual([]);
    expect(paginateWithdrawals(rows, -1, 20)).toEqual([]);
  });

  it('returns an empty array for non-positive page sizes', () => {
    expect(paginateWithdrawals(rows, 1, 0)).toEqual([]);
  });

  it('returns the full array when pageSize exceeds the length', () => {
    expect(paginateWithdrawals(rows, 1, 100)).toHaveLength(25);
  });

  it('returns an empty array for empty input', () => {
    expect(paginateWithdrawals([], 1, 20)).toEqual([]);
  });
});

describe('totalPages', () => {
  it('renders an empty set as 1 empty page (so "Page 1 of 1" stays truthful)', () => {
    expect(totalPages([], 20)).toBe(1);
  });

  it('ceils the page count upward so a partial final page is reachable', () => {
    expect(totalPages(Array.from({ length: 25 }), 20)).toBe(2);
  });

  it('returns 1 for an exact-multiple set', () => {
    expect(totalPages(Array.from({ length: 20 }), 20)).toBe(1);
  });

  it('degrades to 1 on non-positive page sizes', () => {
    expect(totalPages(Array.from({ length: 25 }), 0)).toBe(1);
  });
});
