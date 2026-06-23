import { describe, it, expect, beforeAll } from 'vitest';
import { waitLocale } from 'svelte-i18n';
import { ZodError } from 'zod';
import { makeTransferSchema } from './transfer';

// Importing `makeTransferSchema` pulls in `$lib/i18n`, which registers the
// en/zh/ms catalogs and runs svelte-i18n `init` at module load. Warm all three
// dictionaries so the standalone formatter the schema uses can resolve every
// `validation.transfer.*` key.
beforeAll(async () => {
  await Promise.all([waitLocale('en'), waitLocale('zh'), waitLocale('ms')]);
});

function issueFor(locale: 'en' | 'zh' | 'ms', field: 'amount' | 'desc', value: unknown): string {
  try {
    makeTransferSchema(locale).parse(value);
  } catch (e) {
    if (e instanceof ZodError) {
      const issue = e.issues.find(i => i.path[0] === field);
      if (issue) return issue.message;
      throw new Error(`no issue on ${field}`);
    }
    throw e;
  }
  throw new Error('expected validation to fail');
}

// AC5 — the admin transfer (AdminIn/AdminOut/Promo) validation messages are
// sourced from the catalog and rendered in the active locale. These forms are
// only reachable behind authenticated backend data (a user detail page), so they
// cannot be exercised in the hermetic Playwright suite; this asserts the same
// `.ts` schema factory those components consume produces localized copy.
describe('makeTransferSchema — localized validation messages (AC5)', () => {
  it('renders the amount error per-locale, never English under zh/ms', () => {
    const tooLow = { amount: 0, desc: 'a valid description' };
    expect(issueFor('en', 'amount', tooLow)).toBe('Amount must be greater than 0');
    expect(issueFor('zh', 'amount', tooLow)).toBe('金额必须大于 0');
    expect(issueFor('ms', 'amount', tooLow)).toBe('Jumlah mestilah lebih daripada 0');

    // The English source literal must not leak into the translated locales.
    expect(issueFor('zh', 'amount', tooLow)).not.toContain('Amount must be');
    expect(issueFor('ms', 'amount', tooLow)).not.toContain('Amount must be');

    // All three renderings are genuinely distinct — proof the copy is localized.
    expect(new Set(['en', 'zh', 'ms'].map(l => issueFor(l as 'en', 'amount', tooLow))).size).toBe(3);
  });

  it('localizes the description-length error too', () => {
    const tooShort = { amount: 5, desc: 'x' };
    expect(issueFor('en', 'desc', tooShort)).toBe('Description must be at least 2 characters long');
    expect(issueFor('zh', 'desc', tooShort)).toBe('描述至少需要 2 个字符');
    expect(issueFor('ms', 'desc', tooShort)).toBe('Penerangan mestilah sekurang-kurangnya 2 aksara');
  });
});
