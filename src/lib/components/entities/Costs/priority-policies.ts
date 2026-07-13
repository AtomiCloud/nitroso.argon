// Pure build/parse helpers for the priority policy-chain editor (zinc PR
// #42). A policy applies when its target matches (null = everyone) AND
// hours-to-departure is inside [min, max) (empty = unbounded); the first
// applying rule decides allow/deny. Kept as plain functions so the
// round-trip is unit-testable without a component.
import type { PriorityPolicyReq, PriorityPolicyRes } from '$lib/api/core/data-contracts';
import { buildTarget, parseTarget, targetDraftValid, type TargetDraft } from './priority-targets';

export type PolicyDraft = {
  name: string;
  allow: boolean;
  target: TargetDraft | null;
  // numeric inputs kept as strings; '' = unbounded / no override
  minHours: string;
  maxHours: string;
  feeOverride: string;
};

export function emptyPolicyDraft(): PolicyDraft {
  return { name: '', allow: true, target: null, minHours: '', maxHours: '', feeOverride: '' };
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
    minHours: p.minHoursToDeparture == null ? '' : String(p.minHoursToDeparture),
    maxHours: p.maxHoursToDeparture == null ? '' : String(p.maxHoursToDeparture),
    feeOverride: p.feeOverride == null ? '' : String(p.feeOverride),
  }));
}

/** Editor state → wire; an empty chain POSTs null (legacy gate only). */
export function buildPolicies(drafts: PolicyDraft[]): PriorityPolicyReq[] | null {
  if (drafts.length === 0) return null;
  return drafts.map(d => ({
    name: d.name.trim(),
    allow: d.allow,
    target: buildTarget(d.target),
    minHoursToDeparture: numOrNull(d.minHours),
    maxHoursToDeparture: numOrNull(d.maxHours),
    // deny rules never carry an override (zinc rejects it)
    feeOverride: d.allow ? numOrNull(d.feeOverride) : null,
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
  if (!boundValid(d.minHours) || !boundValid(d.maxHours)) return false;
  const min = numOrNull(d.minHours);
  const max = numOrNull(d.maxHours);
  if (max != null && max <= 0) return false;
  if (min != null && max != null && max <= min) return false;
  if (d.allow && d.feeOverride.trim() !== '') {
    const fee = numOrNull(d.feeOverride);
    if (fee == null || fee < 0 || fee > 10000) return false;
  }
  return true;
}

export function policiesValid(drafts: PolicyDraft[]): boolean {
  return drafts.every(policyDraftValid);
}
