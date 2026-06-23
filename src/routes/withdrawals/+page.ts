import type { ProblemDetails } from '../../errors/problem_details';
import type { WithdrawalPrincipalRes } from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
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
      }),
    await loadError(locale, 'errors.load.withdrawals'),
  ).serial();
  return {
    result: r,
  };
}) satisfies PageLoad;
