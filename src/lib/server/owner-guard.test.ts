import { describe, expect, it } from 'vitest';
import { guardOwner } from './owner-guard';

describe('guardOwner', () => {
  it('allows a session carrying the owner role', () => {
    expect(() => guardOwner({ roles: ['admin', 'owner'] })).not.toThrow();
  });

  it('returns a 404 for an admin without the owner role', () => {
    expectOwnerNotFound(() => guardOwner({ roles: ['admin'] }));
  });

  it('returns a 404 when there is no session', () => {
    expectOwnerNotFound(() => guardOwner(null));
  });
});

function expectOwnerNotFound(run: () => void): void {
  try {
    run();
    throw new Error('expected owner guard to reject the session');
  } catch (error) {
    expect(error).toMatchObject({ status: 404, body: { message: 'Not Found' } });
  }
}
