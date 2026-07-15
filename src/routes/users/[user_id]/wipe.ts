import type { UserPrincipalRes, UserWipeConflict, UserWipeConflictReason } from '$lib/api/core/data-contracts';

/**
 * A wipe rewrites the username to 'deleted-xxxxxxxx'. The zinc UserRes does not
 * (yet) expose `wipedAt`, so a username beginning with 'deleted-' is the
 * reliable signal that an account has already been wiped. Pending swagger
 * regeneration — see the PR summary.
 */
export const WIPED_USERNAME_PREFIX = 'deleted-';

export function isWipedUser(user: Pick<UserPrincipalRes, 'username'> | null | undefined): boolean {
  return (user?.username ?? '').startsWith(WIPED_USERNAME_PREFIX);
}

const KNOWN_REASONS: readonly UserWipeConflictReason[] = ['wallet_not_empty', 'withdrawal_in_flight', 'already_wiped'];

/**
 * Pulls the wipe-conflict reason out of a 409 problem's `data` payload. The
 * ProblemDetails `data` field is typed generically (as Problem), so this
 * narrows it safely and returns null for anything unexpected — callers then
 * fall back to a generic message.
 */
export function wipeConflictReason(problem: { data?: unknown } | null | undefined): UserWipeConflictReason | null {
  const data = (problem?.data ?? null) as Partial<UserWipeConflict> | null;
  const reason = data?.reason;
  return reason != null && KNOWN_REASONS.includes(reason) ? reason : null;
}
