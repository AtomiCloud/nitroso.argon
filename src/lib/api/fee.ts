import type { Api } from '$lib/api/core/Api';
import { toResult } from '$lib/utility';

/**
 * Loads the platform withdrawal fee rate (e.g. 0.04 = 4%) from the zinc API.
 *
 * Shared by the withdrawal-creation dialog, the deposit page notice, and the
 * manual-completion dialog so the loading behaviour stays consistent: on
 * failure the error is logged (console.error) and `null` is returned — callers
 * decide how to degrade (hide the breakdown, show a generic notice, or block
 * submission). The rate is never hardcoded client-side.
 *
 * @param api - the API client (unwrapped `$api` store value)
 * @param errorMessage - caller-localized detail used if the request itself throws
 */
async function loadWithdrawFeeRate(api: Api, errorMessage: string): Promise<number | null> {
  return await toResult(() => api.vWithdrawalFeeList('1.0'), errorMessage).match({
    ok: f => f.withdrawFeeRate,
    err: (e): number | null => {
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

export { loadWithdrawFeeRate, roundToEvenCents };
