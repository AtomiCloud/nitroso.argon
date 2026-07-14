// Pure build/parse helpers for the UNIFIED priority policy editor (zinc PR
// #43): the whole priority system is one ordered rule list — who (target),
// when (SGT clock window and/or hours-to-departure), allow/deny, fee (flat
// SGD or % of the ticket; 0 = free) and an optional per-timeslot slot cap.
// First matching rule decides; no match = deny. Kept as plain functions so
// the round-trip is unit-testable without a component.
import type { PriorityPolicyReq, PriorityPolicyRes } from '$lib/api/core/data-contracts';
import { buildTarget, parseTarget, targetDraftValid, type TargetDraft } from './priority-targets';

export type PolicyFeeKind = 'Flat' | 'Percent';

export type PolicyDraft = {
  name: string;
  allow: boolean;
  target: TargetDraft | null;
  // SGT clock window; both '' = any time (zinc wants both bounds or neither)
  winStart: string;
  winEnd: string;
  // numeric inputs kept as strings; '' = unbounded / default
  minHours: string;
  maxHours: string;
  feeKind: PolicyFeeKind;
  feeValue: string;
  slotCap: string;
};

export function emptyPolicyDraft(): PolicyDraft {
  return {
    name: '',
    allow: true,
    target: null,
    winStart: '',
    winEnd: '',
    minHours: '',
    maxHours: '',
    feeKind: 'Flat',
    feeValue: '0',
    slotCap: '',
  };
}

const numOrNull = (s: string): number | null => {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** Wire → editor state; tolerates missing fields on rollout skew. */
export function parsePolicies(res: PriorityPolicyRes[] | null | undefined): PolicyDraft[] {
  return (res ?? []).map(p => ({
    name: p.name ?? '',
    allow: p.allow === true,
    target: parseTarget(p.target),
    winStart: p.windowStartSgt ?? '',
    winEnd: p.windowEndSgt ?? '',
    minHours: p.minHoursToDeparture == null ? '' : String(p.minHoursToDeparture),
    maxHours: p.maxHoursToDeparture == null ? '' : String(p.maxHoursToDeparture),
    feeKind: p.feeKind === 'Percent' ? 'Percent' : 'Flat',
    feeValue: p.feeValue == null ? '0' : String(p.feeValue),
    slotCap: p.slotCap == null ? '' : String(p.slotCap),
  }));
}

/** Editor state → wire. Deny rules never carry fee/cap (zinc rejects it). */
export function buildPolicies(drafts: PolicyDraft[]): PriorityPolicyReq[] {
  return drafts.map(d => ({
    name: d.name.trim(),
    allow: d.allow,
    target: buildTarget(d.target),
    windowStartSgt: d.winStart === '' ? null : d.winStart,
    windowEndSgt: d.winEnd === '' ? null : d.winEnd,
    minHoursToDeparture: numOrNull(d.minHours),
    maxHoursToDeparture: numOrNull(d.maxHours),
    feeKind: d.allow ? d.feeKind : 'Flat',
    feeValue: d.allow ? (numOrNull(d.feeValue) ?? 0) : 0,
    slotCap: d.allow ? numOrNull(d.slotCap) : null,
  }));
}

const boundValid = (s: string): boolean => {
  const t = s.trim();
  if (t === '') return true;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0;
};

/** Mirrors zinc's PriorityPolicyReqValidator so saves don't bounce. */
export function policyDraftValid(d: PolicyDraft): boolean {
  if (d.name.trim() === '' || d.name.trim().length > 128) return false;
  if (!targetDraftValid(d.target)) return false;
  // both window bounds or neither
  if ((d.winStart === '') !== (d.winEnd === '')) return false;
  if (!boundValid(d.minHours) || !boundValid(d.maxHours)) return false;
  const min = numOrNull(d.minHours);
  const max = numOrNull(d.maxHours);
  if (max != null && max <= 0) return false;
  if (min != null && max != null && max <= min) return false;
  if (d.allow) {
    const fee = numOrNull(d.feeValue);
    if (fee == null || fee < 0) return false;
    if (d.feeKind === 'Flat' && fee > 10000) return false;
    if (d.feeKind === 'Percent' && fee > 100) return false;
    const cap = numOrNull(d.slotCap);
    if (d.slotCap.trim() !== '' && (cap == null || !Number.isInteger(cap) || cap < 1 || cap > 10000)) return false;
  }
  return true;
}

export function policiesValid(drafts: PolicyDraft[]): boolean {
  return drafts.every(policyDraftValid);
}
