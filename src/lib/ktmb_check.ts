import type { BookingKtmbCheckRes } from '$lib/api/core/data-contracts';

export const KTMB_CHECK_POLL_INTERVAL_MS = 2000;
export const KTMB_CHECK_POLL_TIMEOUT_MS = 90_000;

export type KtmbClaim =
  | { kind: 'unclaimed' }
  | { kind: 'self' }
  | { kind: 'other'; bookingId: string }
  // the ticket IS on our account but tin could not look up who claims it
  | { kind: 'unknown'; error: string };

export type KtmbCheckView =
  | { kind: 'none' }
  | { kind: 'pending'; requestedAt: string; timedOut: boolean }
  | { kind: 'found'; ktmbBookingNo: string | null; ktmbTicketNo: string | null; claim: KtmbClaim }
  | { kind: 'notFound' }
  | { kind: 'departed' }
  | { kind: 'error'; error: string | null };

export type RelativeAge = { unit: 'justNow' | 'minutes' | 'hours' | 'days'; value: number };

function ageMs(iso: string, now: number): number {
  return Math.max(0, now - new Date(iso).getTime());
}

/** A Pending check is stale once tin has had POLL_TIMEOUT_MS since it was requested. */
export function isPendingTimedOut(check: BookingKtmbCheckRes, now: number): boolean {
  return check.status === 'Pending' && ageMs(check.requestedAt, now) >= KTMB_CHECK_POLL_TIMEOUT_MS;
}

/** Keep polling only while a check is Pending and still inside the timeout window. */
export function shouldPoll(check: BookingKtmbCheckRes | null, now: number): boolean {
  return check?.status === 'Pending' && !isPendingTimedOut(check, now);
}

function claimOf(check: BookingKtmbCheckRes): KtmbClaim {
  if (check.claimedByBookingId == null && check.error) return { kind: 'unknown', error: check.error };
  if (check.claimedByBookingId == null) return { kind: 'unclaimed' };
  if (check.claimedBySelf) return { kind: 'self' };
  return { kind: 'other', bookingId: check.claimedByBookingId };
}

/** Which message/badge to show for a check (null = never checked) at time `now`. */
export function deriveKtmbCheckView(check: BookingKtmbCheckRes | null, now: number): KtmbCheckView {
  if (check == null) return { kind: 'none' };
  switch (check.status) {
    case 'Pending':
      return { kind: 'pending', requestedAt: check.requestedAt, timedOut: isPendingTimedOut(check, now) };
    case 'Found':
      return {
        kind: 'found',
        ktmbBookingNo: check.ktmbBookingNo ?? null,
        ktmbTicketNo: check.ktmbTicketNo ?? null,
        claim: claimOf(check),
      };
    case 'NotFound':
      return { kind: 'notFound' };
    case 'Departed':
      return { kind: 'departed' };
    default:
      return { kind: 'error', error: check.error ?? null };
  }
}

export function relativeAge(iso: string, now: number): RelativeAge {
  const minutes = Math.floor(ageMs(iso, now) / 60_000);
  if (minutes < 1) return { unit: 'justNow', value: 0 };
  if (minutes < 60) return { unit: 'minutes', value: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { unit: 'hours', value: hours };
  return { unit: 'days', value: Math.floor(hours / 24) };
}

/** Recovering/Duplicate bookings are the ones this check exists for. */
export function isKtmbCheckProminent(status: string | null | undefined): boolean {
  return status === 'Recovering' || status === 'Duplicate';
}
