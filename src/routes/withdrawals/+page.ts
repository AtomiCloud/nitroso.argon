import type { ProblemDetails } from '../../errors/problem_details';
import type { WithdrawalPrincipalRes } from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import { WITHDRAWAL_FETCH_LIMIT } from '$lib/components/entities/Withdrawals/withdrawal-list';
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
  // filter, so a single fetch keeps the matrix honest.
  const r = await toResult(
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
        Limit: WITHDRAWAL_FETCH_LIMIT,
      }),
    await loadError(locale, 'errors.load.withdrawals'),
  ).serial();
  return {
    result: r,
  };
}) satisfies PageLoad;
