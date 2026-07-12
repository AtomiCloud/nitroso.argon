// Pure build/parse helpers for the priority free/access target editors
// (zinc PR #37). The wire shape is the Discounts API target: matchMode
// All/Any/None over (UserId | Role, value) matches. Kept as plain functions
// so the round-trip is unit-testable without a component.
import type { DiscountTargetReq, DiscountTargetRes } from '$lib/api/core/data-contracts';

export type TargetMatchType = 'UserId' | 'Role';
export type TargetMatchMode = 'All' | 'Any' | 'None';

export type TargetMatchDraft = {
  matchType: TargetMatchType;
  value: string;
};

export type TargetDraft = {
  matchMode: TargetMatchMode;
  matches: TargetMatchDraft[];
};

export const TARGET_MATCH_MODES: TargetMatchMode[] = ['All', 'Any', 'None'];
export const TARGET_MATCH_TYPES: TargetMatchType[] = ['UserId', 'Role'];

export function emptyTargetDraft(): TargetDraft {
  return { matchMode: 'Any', matches: [] };
}

/**
 * Wire → editor state. null/undefined (target unset on zinc) parses to null
 * so the editor renders disabled. Unknown modes/types are coerced to safe
 * defaults rather than crashing the admin page on a rollout skew.
 */
export function parseTarget(res: DiscountTargetRes | null | undefined): TargetDraft | null {
  if (res == null) return null;
  const mode = TARGET_MATCH_MODES.includes(res.matchMode as TargetMatchMode)
    ? (res.matchMode as TargetMatchMode)
    : 'Any';
  return {
    matchMode: mode,
    matches: (res.matches ?? []).map(m => ({
      matchType: m.matchType === 'Role' ? 'Role' : 'UserId',
      value: m.value ?? '',
    })),
  };
}

/**
 * Editor state → wire. A null draft (editor disabled) POSTs null, which on
 * zinc means "nobody boosts free" / "keep legacy allowlist behavior". Role
 * values are normalized to lowercase (zinc's pricing roles are lowercase);
 * values are trimmed and empty matches dropped.
 */
export function buildTarget(draft: TargetDraft | null): DiscountTargetReq | null {
  if (draft == null) return null;
  return {
    matchMode: draft.matchMode,
    matches: draft.matches
      .map(m => ({
        matchType: m.matchType,
        value: m.matchType === 'Role' ? m.value.trim().toLowerCase() : m.value.trim(),
      }))
      .filter(m => m.value !== ''),
  };
}

/**
 * An enabled draft is submittable when every chip has a value. (All/Any with
 * zero matches is accepted: zinc treats All-over-empty as vacuously true and
 * Any-over-empty as never matching — the editor warns but does not block.)
 */
export function targetDraftValid(draft: TargetDraft | null): boolean {
  return draft == null || draft.matches.every(m => m.value.trim() !== '');
}
