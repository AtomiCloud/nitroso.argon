import type { Api } from '$lib/api/core/Api';
import type { FeeRes } from '$lib/api/core/data-contracts';
import { toResult } from '$lib/utility';
import { formatMoney, formatNumber } from '$lib/i18n';
import type { SupportedLocale } from '$lib/i18n';

/** The two platform fee types zinc exposes on GET /api/v1/Fee/{type}. */
type FeeType = 'Withdrawal' | 'Deposit';

/**
 * Loads a platform fee (flat SGD component + percentage, e.g. 4 = 4%) from
 * the zinc API.
 *
 * Shared by the withdrawal-creation dialog, the deposit page notice, the
 * manual-completion dialog and the /fees admin page so the loading behaviour
 * stays consistent: on failure the error is logged (console.error) and `null`
 * is returned — callers decide how to degrade (hide the breakdown, show a
 * generic notice, or block submission). The fee is never hardcoded
 * client-side.
 *
 * @param api - the API client (unwrapped `$api` store value)
 * @param type - which fee to load ("Withdrawal" or "Deposit")
 * @param errorMessage - caller-localized detail used if the request itself throws
 */
async function loadFee(api: Api, type: FeeType, errorMessage: string): Promise<FeeRes | null> {
  return await toResult(() => api.vFeeDetail(type, '1.0'), errorMessage).match({
    ok: f => f,
    err: (e): FeeRes | null => {
      console.error(e);
      return null;
    },
  });
}

/**
 * Rounds to cents with half-to-even (banker's) rounding, matching zinc's
 * FeeCalculator (`Math.Round(..., 2, MidpointRounding.ToEven)`) exactly, so a
 * fee shown here can never differ from the fee the ledger books — e.g. rate
 * 2.5% on $1.00 is $0.02 on both sides, where half-up rounding would show
 * $0.03 and overpay the user by a cent on manual completion.
 */
function roundToEvenCents(x: number): number {
  const cents = x * 100;
  const floor = Math.floor(cents);
  const diff = cents - floor;
  const epsilon = 1e-9;
  if (diff > 0.5 + epsilon) return (floor + 1) / 100;
  if (diff < 0.5 - epsilon) return floor / 100;
  return (floor % 2 === 0 ? floor : floor + 1) / 100;
}

/**
 * The fee charged on `amount`: flat component + percentage of the amount,
 * banker's-rounded to cents and capped at the amount itself — mirroring
 * zinc's FeeCalculator so the displayed fee always matches what the ledger
 * books (the cap keeps a large flat fee from producing a negative net).
 */
function calcFee(fee: Pick<FeeRes, 'percentage' | 'flatAmount'>, amount: number): number {
  return Math.min(roundToEvenCents(fee.flatAmount + (fee.percentage / 100) * amount), amount);
}

/** Minimal shape of svelte-i18n's `$_` needed by {@link describeFee}. */
type Translate = (id: string, opts?: { locale?: string | null; values?: Record<string, string | number> }) => string;

/**
 * Human-readable fee summary, e.g. "4% + S$2.00", omitting a zero component
 * ("4%", "S$2.00") and falling back to the localized "No fee" when both are
 * zero. Pass the component's `$_` and `$lang` so the string follows the
 * active locale reactively.
 */
function describeFee(fee: Pick<FeeRes, 'percentage' | 'flatAmount'>, t: Translate, lang: SupportedLocale): string {
  const rate = formatNumber(fee.percentage, lang, { maximumFractionDigits: 2 });
  const flat = formatMoney(fee.flatAmount, lang);
  if (fee.percentage === 0 && fee.flatAmount === 0) return t('fees.display.none', { locale: lang });
  if (fee.flatAmount === 0) return t('fees.display.percentOnly', { locale: lang, values: { rate } });
  if (fee.percentage === 0) return t('fees.display.flatOnly', { locale: lang, values: { flat } });
  return t('fees.display.both', { locale: lang, values: { rate, flat } });
}

/** True when the fee is disabled (0% and $0) and all fee UI should be hidden. */
function isZeroFee(fee: Pick<FeeRes, 'percentage' | 'flatAmount'> | null): boolean {
  return fee != null && fee.percentage === 0 && fee.flatAmount === 0;
}

export { loadFee, roundToEvenCents, calcFee, describeFee, isZeroFee, type FeeType };
