import { z } from 'zod';
import { formatStandalone, type SupportedLocale } from '$lib/i18n';
import type { CreateWithdrawalReq, WithdrawalRecordRes, WithdrawalSettingsRes } from '$lib/api/core/data-contracts';

/**
 * The two withdrawal rails zinc supports (zinc PR #36): "CardRefund" refunds
 * the money back onto the cards that funded the wallet (fragmented,
 * oldest-first, capped by the refundable pool); "PayNow" is the original
 * payout to an 8-digit PayNow mobile number.
 */
export type WithdrawalMethod = 'CardRefund' | 'PayNow';

/**
 * zinc's defaults when no withdrawal-settings row exists (and our fallback
 * when GET settings/current fails — the server re-enforces the real policy on
 * create, so an optimistic default only ever costs a clean server rejection).
 */
export const DEFAULT_WITHDRAWAL_SETTINGS: WithdrawalSettingsRes = {
  cardRefundEnabled: true,
  payNowMode: 'FallbackOnly',
  sweepEnabled: false,
};

/**
 * How each method option should render given the platform policy and the
 * user's live input.
 *
 * - card: 'selectable' | 'disabled' — the card option always stays visible;
 *   when the policy turns it off it renders disabled with a note.
 * - payNow: 'selectable' | 'locked' | 'hidden' — mode Disabled hides the
 *   option entirely; FallbackOnly renders it 'locked' (disabled, with a note
 *   that it unlocks when card refunds can't cover the amount) until the typed
 *   amount strictly exceeds the refundable pool, mirroring zinc's rule
 *   (PayNow iff Enabled, or FallbackOnly AND pool < amount).
 * - unavailable: no method can ever be selected (card off + PayNow hidden) —
 *   the dialog shows a "withdrawals are currently unavailable" alert and
 *   blocks submission.
 */
export interface MethodAvailability {
  card: 'selectable' | 'disabled';
  payNow: 'selectable' | 'locked' | 'hidden';
  unavailable: boolean;
}

/**
 * Pure policy → UI-availability mapping, recomputed on every amount keystroke
 * so the FallbackOnly unlock is live. `pool` is null while the refundable
 * pool is loading or failed to load: fallback PayNow then stays locked (we
 * cannot prove the pool is insufficient; the server would reject anyway).
 * An unrecognized payNowMode is treated as FallbackOnly — zinc's default and
 * the most conservative visible option (never shows an always-on PayNow, never
 * hides a rail the server might allow).
 */
export function methodAvailability(
  settings: Pick<WithdrawalSettingsRes, 'cardRefundEnabled' | 'payNowMode'>,
  pool: number | null,
  amount: number,
): MethodAvailability {
  const card = settings.cardRefundEnabled ? 'selectable' : 'disabled';

  let payNow: MethodAvailability['payNow'];
  if (settings.payNowMode === 'Enabled') {
    payNow = 'selectable';
  } else if (settings.payNowMode === 'Disabled') {
    payNow = 'hidden';
  } else {
    // FallbackOnly (and unknown modes): unlocked only once the typed amount
    // strictly exceeds the known pool — same strict inequality as zinc
    payNow = pool != null && Number.isFinite(amount) && amount > pool ? 'selectable' : 'locked';
  }

  return { card, payNow, unavailable: card === 'disabled' && payNow === 'hidden' };
}

/**
 * Build the create-withdrawal form schema for the selected method, with its
 * validation messages localized for `locale` (same standalone-formatter
 * pattern as `Wallets/transfer.ts` — no Svelte store access in plain `.ts`).
 *
 * - PayNow: amount + a mandatory 8-digit PayNow number.
 * - CardRefund: amount only (the PayNow field is hidden), additionally capped
 *   at the user's refundable `pool` when it is known (`null` = still loading /
 *   failed to load — the component blocks submission separately, so the
 *   schema simply omits the pool bound rather than failing on a guess).
 *
 * The server re-validates everything; these bounds only exist for instant
 * feedback.
 */
export function makeCreateWithdrawalSchema(
  locale: SupportedLocale,
  opts: { usable: number; method: WithdrawalMethod; pool: number | null },
): z.ZodType<{ amount: number; payNowNumber?: string }, z.ZodTypeDef, unknown> {
  // NOTE on the casts below: with this repo's `strictNullChecks: false`, zod
  // infers every object field as optional at the TYPE level even though the
  // schemas genuinely require them at runtime (z.coerce.number() rejects
  // undefined; the PayNow regex rejects a missing string). The explicit
  // return type restores the honest output shape for callers.
  const t = (key: string) => formatStandalone(`withdrawals.create.${key}`, { locale });

  const amount = z.coerce
    .number()
    .gt(0, t('amountGreaterThanZero'))
    .max(opts.usable, t('amountExceedsBalance'))
    .finite(t('amountFinite'));

  if (opts.method === 'CardRefund') {
    const pool = opts.pool;
    // pool bound applied at the object level (path: amount) so the field
    // itself stays a plain number schema in both branches
    return z.object({ amount }).refine(v => pool == null || v.amount <= pool, {
      message: t('amountExceedsPool'),
      path: ['amount'],
    }) as unknown as z.ZodType<{ amount: number }, z.ZodTypeDef, unknown>;
  }

  return z.object({
    amount,
    payNowNumber: z.string().regex(/^\d{8}$/, t('invalidPayNow')),
  }) as unknown as z.ZodType<{ amount: number; payNowNumber: string }, z.ZodTypeDef, unknown>;
}

/**
 * Assemble the POST body for the selected method. CardRefund must NOT carry a
 * payNowNumber (zinc rejects it); PayNow always sends one. The method is sent
 * explicitly in both cases even though zinc defaults an omitted method to
 * PayNow — explicit beats rollout-compat defaulting.
 */
export function toCreateWithdrawalReq(
  method: WithdrawalMethod,
  v: { amount: number; payNowNumber?: string },
): CreateWithdrawalReq {
  return method === 'CardRefund'
    ? { amount: v.amount, method: 'CardRefund' }
    : { amount: v.amount, payNowNumber: v.payNowNumber, method: 'PayNow' };
}

/**
 * Whether a withdrawal record is a card refund. Responses predating the
 * method field (rollout compat) can only be PayNow withdrawals, so a missing
 * method safely reads as PayNow.
 */
export function isCardRefund(record: Pick<WithdrawalRecordRes, 'method'>): boolean {
  return record.method === 'CardRefund';
}

/**
 * Shorten a long gateway id for display (`int_hkdm…x9q2`); the full value
 * stays available via tooltip + copy-on-click. Ids at or under the shortened
 * length render untouched.
 */
export function shortenId(id: string, head = 10, tail = 4): string {
  return id.length <= head + tail + 1 ? id : `${id.slice(0, head)}…${id.slice(-tail)}`;
}

/**
 * Badge colors for the refund-fragment statuses (zinc: Created → Settled |
 * Failed): amber while pending, green once Airwallex settles, red on failure.
 * Mirrors the WITHDRAWAL_STATUS_BADGE convention.
 */
export const REFUND_STATUS_BADGE: Record<string, string> = {
  Created: 'bg-amber-500',
  Settled: 'bg-green-500',
  Failed: 'bg-red-500',
};
