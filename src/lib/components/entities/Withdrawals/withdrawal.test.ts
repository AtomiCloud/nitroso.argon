import { describe, it, expect, beforeAll } from 'vitest';
import { waitLocale } from 'svelte-i18n';
import { ZodError } from 'zod';
import {
  DEFAULT_WITHDRAWAL_SETTINGS,
  isCardRefund,
  makeCreateWithdrawalSchema,
  methodAvailability,
  REFUND_STATUS_BADGE,
  shortenId,
  toCreateWithdrawalReq,
  type WithdrawalMethod,
} from './withdrawal';

// Importing the schema factory pulls in `$lib/i18n`, which registers the
// en/zh/ms catalogs and runs svelte-i18n `init` at module load. Warm all three
// dictionaries so the standalone formatter can resolve every
// `withdrawals.create.*` key (same setup as Wallets/transfer.test.ts).
beforeAll(async () => {
  await Promise.all([waitLocale('en'), waitLocale('zh'), waitLocale('ms')]);
});

type Opts = { usable: number; method: WithdrawalMethod; pool: number | null };

function issueFor(opts: Opts, value: unknown, locale: 'en' | 'zh' | 'ms' = 'en'): string[] {
  try {
    makeCreateWithdrawalSchema(locale, opts).parse(value);
  } catch (e) {
    if (e instanceof ZodError) return e.issues.map(i => i.message);
    throw e;
  }
  return [];
}

describe('makeCreateWithdrawalSchema — CardRefund', () => {
  const opts: Opts = { usable: 100, method: 'CardRefund', pool: 40 };

  it('accepts an amount within both the wallet and the pool, without a PayNow number', () => {
    const v = makeCreateWithdrawalSchema('en', opts).parse({ amount: 40 });
    expect(v).toEqual({ amount: 40 });
  });

  it('rejects amounts above the refundable pool', () => {
    expect(issueFor(opts, { amount: 40.01 })).toEqual(['Amount must be within what is refundable to your cards']);
  });

  it('rejects amounts above the wallet even when the pool is larger', () => {
    const rich: Opts = { usable: 30, method: 'CardRefund', pool: 500 };
    expect(issueFor(rich, { amount: 31 })).toEqual(['Amount must be less than or equal to your usable balance']);
  });

  it('rejects zero and non-finite amounts', () => {
    expect(issueFor(opts, { amount: 0 })).toContain('Amount must be greater than 0');
    expect(issueFor(opts, { amount: Infinity }).length).toBeGreaterThan(0);
  });

  it('omits the pool bound while the pool is unknown (null) — the component blocks submit separately', () => {
    const loading: Opts = { usable: 100, method: 'CardRefund', pool: null };
    expect(issueFor(loading, { amount: 99 })).toEqual([]);
  });

  it('ignores any stray payNowNumber input (field is hidden in card mode)', () => {
    const v = makeCreateWithdrawalSchema('en', opts).parse({ amount: 10, payNowNumber: '12345678' });
    expect(v).toEqual({ amount: 10 });
  });

  it('localizes the pool-bound message (zh/ms differ from en)', () => {
    const messages = (['en', 'zh', 'ms'] as const).map(l => issueFor(opts, { amount: 41 }, l)[0]);
    expect(new Set(messages).size).toBe(3);
    expect(messages[1]).not.toContain('Amount must be');
  });
});

describe('makeCreateWithdrawalSchema — PayNow', () => {
  const opts: Opts = { usable: 100, method: 'PayNow', pool: null };

  it('requires an 8-digit PayNow number', () => {
    expect(issueFor(opts, { amount: 10, payNowNumber: '1234567' })).toEqual(['PayNow number must be exactly 8 digits']);
    expect(issueFor(opts, { amount: 10, payNowNumber: '' })).toEqual(['PayNow number must be exactly 8 digits']);
    expect(issueFor(opts, { amount: 10, payNowNumber: '91234567' })).toEqual([]);
  });

  it('never applies a pool bound, even if a pool is passed', () => {
    const withPool: Opts = { usable: 100, method: 'PayNow', pool: 5 };
    expect(issueFor(withPool, { amount: 50, payNowNumber: '91234567' })).toEqual([]);
  });
});

describe('methodAvailability', () => {
  const on = { cardRefundEnabled: true };
  const off = { cardRefundEnabled: false };

  describe('card option', () => {
    it('is selectable when the policy allows card refunds', () => {
      expect(methodAvailability({ ...on, payNowMode: 'Enabled' }, 100, 10).card).toBe('selectable');
    });

    it('is disabled (visible, with a note) when the policy turns card refunds off', () => {
      expect(methodAvailability({ ...off, payNowMode: 'Enabled' }, 100, 10).card).toBe('disabled');
    });
  });

  describe('payNow — mode Enabled', () => {
    it('is always selectable, regardless of pool and amount', () => {
      expect(methodAvailability({ ...on, payNowMode: 'Enabled' }, 100, 10).payNow).toBe('selectable');
      expect(methodAvailability({ ...on, payNowMode: 'Enabled' }, null, 0).payNow).toBe('selectable');
    });
  });

  describe('payNow — mode Disabled', () => {
    it('is hidden entirely', () => {
      expect(methodAvailability({ ...on, payNowMode: 'Disabled' }, 100, 500).payNow).toBe('hidden');
    });
  });

  describe('payNow — mode FallbackOnly', () => {
    const s = { ...on, payNowMode: 'FallbackOnly' };

    it('stays locked while the amount is within the pool', () => {
      expect(methodAvailability(s, 100, 50).payNow).toBe('locked');
    });

    it('stays locked at exactly the pool boundary (zinc unlocks strictly on pool < amount)', () => {
      expect(methodAvailability(s, 100, 100).payNow).toBe('locked');
    });

    it('unlocks reactively once the amount exceeds the pool', () => {
      expect(methodAvailability(s, 100, 100.01).payNow).toBe('selectable');
    });

    it('unlocks for any positive amount when the pool is zero', () => {
      expect(methodAvailability(s, 0, 0.01).payNow).toBe('selectable');
    });

    it('stays locked while the pool is unknown (loading/failed) or the amount is not a number', () => {
      expect(methodAvailability(s, null, 500).payNow).toBe('locked');
      expect(methodAvailability(s, 100, NaN).payNow).toBe('locked');
    });

    it('treats an unknown mode as FallbackOnly (conservative default)', () => {
      expect(methodAvailability({ ...on, payNowMode: 'SomethingNew' }, 100, 50).payNow).toBe('locked');
      expect(methodAvailability({ ...on, payNowMode: 'SomethingNew' }, 100, 200).payNow).toBe('selectable');
    });
  });

  describe('unavailable — no rail open at all', () => {
    it('flags card-off + payNow-hidden as fully unavailable', () => {
      const a = methodAvailability({ ...off, payNowMode: 'Disabled' }, 100, 10);
      expect(a).toEqual({ card: 'disabled', payNow: 'hidden', unavailable: true });
    });

    it('is not flagged while any rail can (eventually) be used', () => {
      // card off but PayNow reachable via fallback
      expect(methodAvailability({ ...off, payNowMode: 'FallbackOnly' }, 100, 10).unavailable).toBe(false);
      // paynow hidden but card on
      expect(methodAvailability({ ...on, payNowMode: 'Disabled' }, 100, 10).unavailable).toBe(false);
    });
  });

  it('zinc defaults (card on, FallbackOnly, sweep off) produce the pre-settings UI: card selectable, PayNow locked', () => {
    const a = methodAvailability(DEFAULT_WITHDRAWAL_SETTINGS, null, 0);
    expect(a).toEqual({ card: 'selectable', payNow: 'locked', unavailable: false });
    expect(DEFAULT_WITHDRAWAL_SETTINGS.sweepEnabled).toBe(false);
  });
});

describe('toCreateWithdrawalReq', () => {
  it('CardRefund sends method without any payNowNumber (zinc rejects one)', () => {
    const req = toCreateWithdrawalReq('CardRefund', { amount: 25, payNowNumber: '91234567' });
    expect(req).toEqual({ amount: 25, method: 'CardRefund' });
    expect('payNowNumber' in req).toBe(false);
  });

  it('PayNow sends the number and the explicit method', () => {
    expect(toCreateWithdrawalReq('PayNow', { amount: 25, payNowNumber: '91234567' })).toEqual({
      amount: 25,
      payNowNumber: '91234567',
      method: 'PayNow',
    });
  });
});

describe('isCardRefund', () => {
  it('reads CardRefund records', () => {
    expect(isCardRefund({ method: 'CardRefund' })).toBe(true);
  });

  it('reads PayNow and legacy (missing-method) records as PayNow', () => {
    expect(isCardRefund({ method: 'PayNow' })).toBe(false);
    expect(isCardRefund({ method: undefined as unknown as string })).toBe(false);
  });
});

describe('shortenId', () => {
  it('shortens long gateway ids, keeping head and tail', () => {
    expect(shortenId('int_hkdmr4nx9ghxxvpndns')).toBe('int_hkdmr4…ndns');
  });

  it('leaves short ids untouched', () => {
    expect(shortenId('int_short')).toBe('int_short');
    // exactly at the head+tail+1 boundary stays whole
    expect(shortenId('123456789012345')).toBe('123456789012345');
  });
});

describe('REFUND_STATUS_BADGE', () => {
  it('covers exactly the three zinc refund statuses with the spec colors', () => {
    expect(REFUND_STATUS_BADGE).toEqual({
      Created: 'bg-amber-500',
      Settled: 'bg-green-500',
      Failed: 'bg-red-500',
    });
  });
});
