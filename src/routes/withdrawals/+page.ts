import type { ProblemDetails } from '../../errors/problem_details';
import type { WithdrawalPrincipalRes } from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import { WITHDRAWAL_FETCH_LIMIT, WITHDRAWAL_FETCH_PAGE } from '$lib/components/entities/Withdrawals/withdrawal-list';
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

  const userId = url.searchParams.get('userId') ?? '';
  const completerId = url.searchParams.get('completerId') ?? '';
  const id = url.searchParams.get('id') ?? '';
  const min = url.searchParams.get('min') ?? '';
  const max = url.searchParams.get('max') ?? '';
  const after = url.searchParams.get('after') ?? '';
  const before = url.searchParams.get('before') ?? '';
  const status = url.searchParams.get('status') ?? '';

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
          UserId: userId,
          After: after,
          Before: before,
          Status: status,
          Min: min.length == 0 ? undefined : parseFloat(min),
          Max: max.length == 0 ? undefined : parseFloat(max),
          Id: id,
          CompleterId: completerId,
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
