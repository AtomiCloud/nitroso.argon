import { describe, expect, it } from 'vitest';
import type { PriorityPolicyRes } from '$lib/api/core/data-contracts';
import { buildPolicies, emptyPolicyDraft, parsePolicies, policyDraftValid } from './priority-policies';

describe('unified priority policy drafts', () => {
  it('round-trips wire -> draft -> wire', () => {
    const wire: PriorityPolicyRes[] = [
      {
        name: 'vip anytime',
        allow: true,
        target: { matchMode: 'Any', matches: [{ matchType: 'Role', value: 'vip' }] },
        windowStartSgt: '14:00:00',
        windowEndSgt: '16:00:00',
        minHoursToDeparture: 6,
        maxHoursToDeparture: 48,
        feeKind: 'Percent',
        feeValue: 12.5,
        slotCap: 3,
      },
      {
        name: 'deny the rest',
        allow: false,
        target: null,
        windowStartSgt: null,
        windowEndSgt: null,
        minHoursToDeparture: null,
        maxHoursToDeparture: null,
        feeKind: 'Flat',
        feeValue: 0,
        slotCap: null,
      },
    ];
    const built = buildPolicies(parsePolicies(wire));
    expect(built).toEqual(wire);
  });

  it('deny rules drop fee and cap on build', () => {
    const d = {
      ...emptyPolicyDraft(),
      name: 'x',
      allow: false,
      feeKind: 'Percent' as const,
      feeValue: '25',
      slotCap: '5',
    };
    const built = buildPolicies([d])[0];
    expect(built.feeKind).toBe('Flat');
    expect(built.feeValue).toBe(0);
    expect(built.slotCap).toBeNull();
  });

  it('validates like zinc: name, window pairing, hour bounds, fee ranges, cap', () => {
    const ok = { ...emptyPolicyDraft(), name: 'ok' };
    expect(policyDraftValid(ok)).toBe(true);
    expect(policyDraftValid({ ...ok, name: '' })).toBe(false);
    expect(policyDraftValid({ ...ok, winStart: '14:00:00' })).toBe(false);
    expect(policyDraftValid({ ...ok, winStart: '14:00:00', winEnd: '16:00:00' })).toBe(true);
    expect(policyDraftValid({ ...ok, minHours: '-1' })).toBe(false);
    expect(policyDraftValid({ ...ok, minHours: '48', maxHours: '24' })).toBe(false);
    expect(policyDraftValid({ ...ok, minHours: '24', maxHours: '48' })).toBe(true);
    expect(policyDraftValid({ ...ok, feeValue: 'abc' })).toBe(false);
    expect(policyDraftValid({ ...ok, feeValue: '10001' })).toBe(false);
    expect(policyDraftValid({ ...ok, feeKind: 'Percent', feeValue: '101' })).toBe(false);
    expect(policyDraftValid({ ...ok, feeKind: 'Percent', feeValue: '15' })).toBe(true);
    expect(policyDraftValid({ ...ok, slotCap: '0' })).toBe(false);
    expect(policyDraftValid({ ...ok, slotCap: '3' })).toBe(true);
    // deny rules skip fee/cap validation entirely
    expect(policyDraftValid({ ...ok, allow: false, feeValue: 'abc', slotCap: '0' })).toBe(true);
  });

  it('parses missing fields defensively', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drafts = parsePolicies([{ name: 'x' } as any]);
    expect(drafts[0]).toEqual({
      name: 'x',
      allow: false,
      target: null,
      winStart: '',
      winEnd: '',
      minHours: '',
      maxHours: '',
      feeKind: 'Flat',
      feeValue: '0',
      slotCap: '',
    });
  });
});
