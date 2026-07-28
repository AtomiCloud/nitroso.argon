import type { ProblemDetails } from '../../errors/problem_details';
import type { WithdrawalPrincipalRes } from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import { WITHDRAWAL_FETCH_LIMIT, WITHDRAWAL_FETCH_PAGE } from '$lib/components/entities/Withdrawals/withdrawal-list';
import { withdrawalFiltersFromUrl } from '$lib/components/entities/Withdrawals/withdrawal-export';
import type { PageLoad } from './$types';

export const load = (async ({
  parent,
  url,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails] | ['ok', WithdrawalPrincipalRes[]];
}> => {
  const { session, locale } = await parent();

  const api = NewApi({ data: { session }, fetch });

  // Shared with the CSV export button so the download can never cover a
  // different set of rows than the table above it. The keys are already the
  // zinc casing the query below wants, so they spread straight in.
  const filters = withdrawalFiltersFromUrl(url);

  // Pull a generous slice of rows so the client can paginate (20/page)
  // and free-text-search by row-local fields (uuid / PayNow / confirmation
  // / amount). The list endpoint has no username/email/confirmation-id
  // filter, and zinc caps Limit at 100 per call — so assemble the history
  // through Limit/Skip chunks until a short page (bounded by the cap).
  const err = await loadError(locale, 'errors.load.withdrawals');
  const all: WithdrawalPrincipalRes[] = [];
  let r: ['err', ProblemDetails] | ['ok', WithdrawalPrincipalRes[]] = ['ok', all];
  for (let skip = 0; skip < WITHDRAWAL_FETCH_LIMIT; skip += WITHDRAWAL_FETCH_PAGE) {
    const page = await toResult(
      () =>
        api.vWithdrawalDetail('1', {
          ...filters,
          Min: filters.Min.length == 0 ? undefined : parseFloat(filters.Min),
          Max: filters.Max.length == 0 ? undefined : parseFloat(filters.Max),
          Limit: WITHDRAWAL_FETCH_PAGE,
          Skip: skip,
        }),
      err,
    ).serial();
    if (page[0] === 'err') {
      r = page;
      break;
    }
    all.push(...page[1]);
    if (page[1].length < WITHDRAWAL_FETCH_PAGE) break;
  }
  return {
    result: r,
  };
}) satisfies PageLoad;
