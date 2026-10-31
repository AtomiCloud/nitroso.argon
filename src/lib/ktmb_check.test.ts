import { describe, expect, it } from 'vitest';
import type { BookingKtmbCheckRes } from '$lib/api/core/data-contracts';
import {
  KTMB_CHECK_POLL_TIMEOUT_MS,
  deriveKtmbCheckView,
  isKtmbCheckProminent,
  relativeAge,
  shouldPoll,
} from './ktmb_check';

const NOW = Date.parse('2026-10-31T10:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function check(over: Partial<BookingKtmbCheckRes> = {}): BookingKtmbCheckRes {
  return {
    id: 'c1',
    bookingId: 'b1',
    status: 'Pending',
    requestedAt: ago(5_000),
    requestedBy: 'admin',
    checkedAt: null,
    ktmbBookingNo: null,
    ktmbTicketNo: null,
    claimedByBookingId: null,
    claimedBySelf: false,
    error: null,
    ...over,
  };
}

describe('deriveKtmbCheckView', () => {
  it('null check means never checked', () => {
    expect(deriveKtmbCheckView(null, NOW)).toEqual({ kind: 'none' });
  });

  it('Found + no claimant is an unclaimed ticket', () => {
    const v = deriveKtmbCheckView(
      check({ status: 'Found', ktmbBookingNo: 'KB1', ktmbTicketNo: 'T1', checkedAt: ago(1000) }),
      NOW,
    );
    expect(v).toEqual({ kind: 'found', ktmbBookingNo: 'KB1', ktmbTicketNo: 'T1', claim: { kind: 'unclaimed' } });
  });

  it('Found claimed by this booking', () => {
    const v = deriveKtmbCheckView(check({ status: 'Found', claimedByBookingId: 'b1', claimedBySelf: true }), NOW);
    expect(v).toMatchObject({ kind: 'found', claim: { kind: 'self' } });
  });

  it('Found claimed by another booking carries its id', () => {
    const v = deriveKtmbCheckView(check({ status: 'Found', claimedByBookingId: 'b2', claimedBySelf: false }), NOW);
    expect(v).toMatchObject({ kind: 'found', claim: { kind: 'other', bookingId: 'b2' } });
  });

  it('NotFound', () => {
    expect(deriveKtmbCheckView(check({ status: 'NotFound' }), NOW)).toEqual({ kind: 'notFound' });
  });

  it('Departed', () => {
    expect(deriveKtmbCheckView(check({ status: 'Departed' }), NOW)).toEqual({ kind: 'departed' });
  });

  it('Error carries the error text', () => {
    expect(deriveKtmbCheckView(check({ status: 'Error', error: 'boom' }), NOW)).toEqual({
      kind: 'error',
      error: 'boom',
    });
    expect(deriveKtmbCheckView(check({ status: 'Error', error: null }), NOW)).toEqual({
      kind: 'error',
      error: null,
    });
  });

  it('Pending inside the window is not timed out', () => {
    expect(deriveKtmbCheckView(check({ requestedAt: ago(10_000) }), NOW)).toMatchObject({
      kind: 'pending',
      timedOut: false,
    });
  });

  it('Pending past the timeout is timed out', () => {
    const requestedAt = ago(KTMB_CHECK_POLL_TIMEOUT_MS);
    expect(deriveKtmbCheckView(check({ requestedAt }), NOW)).toEqual({
      kind: 'pending',
      requestedAt,
      timedOut: true,
    });
  });
});

describe('shouldPoll', () => {
  it('polls a fresh Pending check', () => {
    expect(shouldPoll(check(), NOW)).toBe(true);
  });

  it('stops once Pending is older than the timeout', () => {
    expect(shouldPoll(check({ requestedAt: ago(KTMB_CHECK_POLL_TIMEOUT_MS - 1) }), NOW)).toBe(true);
    expect(shouldPoll(check({ requestedAt: ago(KTMB_CHECK_POLL_TIMEOUT_MS) }), NOW)).toBe(false);
  });

  it('never polls a settled or missing check', () => {
    expect(shouldPoll(null, NOW)).toBe(false);
    for (const status of ['Found', 'NotFound', 'Departed', 'Error']) {
      expect(shouldPoll(check({ status }), NOW)).toBe(false);
    }
  });
});

describe('relativeAge', () => {
  it('buckets by unit', () => {
    expect(relativeAge(ago(30_000), NOW)).toEqual({ unit: 'justNow', value: 0 });
    expect(relativeAge(ago(5 * 60_000), NOW)).toEqual({ unit: 'minutes', value: 5 });
    expect(relativeAge(ago(3 * 3_600_000), NOW)).toEqual({ unit: 'hours', value: 3 });
    expect(relativeAge(ago(50 * 3_600_000), NOW)).toEqual({ unit: 'days', value: 2 });
  });

  it('clamps future timestamps (clock skew) to just now', () => {
    expect(relativeAge(new Date(NOW + 60_000).toISOString(), NOW)).toEqual({ unit: 'justNow', value: 0 });
  });
});

describe('isKtmbCheckProminent', () => {
  it('is prominent only for Recovering and Duplicate', () => {
    expect(isKtmbCheckProminent('Recovering')).toBe(true);
    expect(isKtmbCheckProminent('Duplicate')).toBe(true);
    expect(isKtmbCheckProminent('Completed')).toBe(false);
    expect(isKtmbCheckProminent(null)).toBe(false);
  });
});
