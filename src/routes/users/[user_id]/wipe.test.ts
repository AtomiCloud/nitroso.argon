import { describe, expect, it } from 'vitest';
import { isWipedUser, wipeConflictReason, WIPED_USERNAME_PREFIX } from './wipe';

describe('isWipedUser', () => {
  it('is true when the username was rewritten to deleted-xxxxxxxx', () => {
    expect(isWipedUser({ username: 'deleted-a1b2c3d4' })).toBe(true);
    expect(isWipedUser({ username: `${WIPED_USERNAME_PREFIX}ff00ff00` })).toBe(true);
  });

  it('is false for a normal username', () => {
    expect(isWipedUser({ username: 'alice' })).toBe(false);
    expect(isWipedUser({ username: 'user-2024' })).toBe(false);
    expect(isWipedUser({ username: 'bob_smith' })).toBe(false);
  });

  it('treats a null/missing username as not wiped', () => {
    expect(isWipedUser({ username: null })).toBe(false);
    expect(isWipedUser({ username: undefined })).toBe(false);
    expect(isWipedUser({})).toBe(false);
    expect(isWipedUser(null)).toBe(false);
    expect(isWipedUser(undefined)).toBe(false);
  });

  it('is case-sensitive — only lowercase deleted- counts', () => {
    expect(isWipedUser({ username: 'Deleted-a1b2c3d4' })).toBe(false);
  });
});

describe('wipeConflictReason', () => {
  it('returns each known wipe-conflict reason from a 409 problem', () => {
    expect(wipeConflictReason({ data: { reason: 'wallet_not_empty' } })).toBe('wallet_not_empty');
    expect(wipeConflictReason({ data: { reason: 'withdrawal_in_flight' } })).toBe('withdrawal_in_flight');
    expect(wipeConflictReason({ data: { reason: 'already_wiped' } })).toBe('already_wiped');
  });

  it('returns null for an unknown reason string', () => {
    expect(wipeConflictReason({ data: { reason: 'nope' } })).toBeNull();
  });

  it('returns null when there is no data payload', () => {
    expect(wipeConflictReason({})).toBeNull();
    expect(wipeConflictReason({ data: null })).toBeNull();
    expect(wipeConflictReason({ data: undefined })).toBeNull();
    expect(wipeConflictReason(null)).toBeNull();
    expect(wipeConflictReason(undefined)).toBeNull();
  });

  it('reads reason from the full zinc payload (detail + userId + reason)', () => {
    expect(
      wipeConflictReason({
        data: { detail: 'wallet not empty', userId: 'u-1', reason: 'wallet_not_empty' },
      }),
    ).toBe('wallet_not_empty');
  });
});
