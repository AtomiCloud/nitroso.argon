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

export { loadWithdrawFeeRate };
