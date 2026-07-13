import { describe, expect, it } from 'vitest';
import type { PriorityPolicyRes } from '$lib/api/core/data-contracts';
import {
  buildPolicies,
  emptyPolicyDraft,
  parsePolicies,
  policyDraftValid,
} from './priority-policies';

describe('priority policy drafts', () => {
  it('round-trips wire -> draft -> wire', () => {
    const wire: PriorityPolicyRes[] = [
      {
        name: 'vip anytime',
        allow: true,
        target: { matchMode: 'Any', matches: [{ matchType: 'Role', value: 'vip' }] },
        minHoursToDeparture: null,
        maxHoursToDeparture: null,
        feeOverride: 25,
      },
      {
        name: 'closed inside 6h',
        allow: false,
        target: null,
        minHoursToDeparture: null,
        maxHoursToDeparture: 6,
        feeOverride: null,
      },
    ];
    const built = buildPolicies(parsePolicies(wire));
    expect(built).toEqual(wire);
  });

  it('empty chain builds null (legacy gate only)', () => {
    expect(buildPolicies([])).toBeNull();
  });

  it('deny rules drop fee overrides on build', () => {
    const d = { ...emptyPolicyDraft(), name: 'x', allow: false, feeOverride: '25' };
    expect(buildPolicies([d])![0].feeOverride).toBeNull();
  });

  it('validates like zinc: name, bounds, non-empty interval, fee range', () => {
    expect(policyDraftValid({ ...emptyPolicyDraft(), name: '' })).toBe(false);
    expect(policyDraftValid({ ...emptyPolicyDraft(), name: 'ok' })).toBe(true);
    expect(policyDraftValid({ ...emptyPolicyDraft(), name: 'ok', minHours: '-1' })).toBe(false);
    expect(policyDraftValid({ ...emptyPolicyDraft(), name: 'ok', maxHours: '0' })).toBe(false);
    expect(
      policyDraftValid({ ...emptyPolicyDraft(), name: 'ok', minHours: '48', maxHours: '24' }),
    ).toBe(false);
    expect(
      policyDraftValid({ ...emptyPolicyDraft(), name: 'ok', minHours: '24', maxHours: '48' }),
    ).toBe(true);
    expect(policyDraftValid({ ...emptyPolicyDraft(), name: 'ok', feeOverride: 'abc' })).toBe(false);
    expect(policyDraftValid({ ...emptyPolicyDraft(), name: 'ok', feeOverride: '10001' })).toBe(
      false,
    );
  });

  it('parses missing fields defensively', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drafts = parsePolicies([{ name: 'x' } as any]);
    expect(drafts[0]).toEqual({
      name: 'x',
      allow: false,
      target: null,
      minHours: '',
      maxHours: '',
      feeOverride: '',
    });
  });
});
