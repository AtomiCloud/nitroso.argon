import type { PageLoad } from './$types';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import type { ProblemDetails } from '../../../errors/problem_details';
import { NewApi } from '../../../store';
import type { TransactionRes } from '$lib/api/core/data-contracts';

export const load = (async ({
  params,
  parent,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails] | ['ok', TransactionRes];
}> => {
  const data = await parent();
  const api = NewApi({ data, fetch });

  const walletId = params.transaction_id;

  //@ts-ignore
  const userId = data.session.roles?.includes('admin') ? undefined : (data.user?.principal.id ?? '');

  const r = await toResult(
    () => api.vTransactionDetail2(walletId, '1', { userId }),
    await loadError(data.locale, 'errors.load.transaction'),
  ).serial();

  return {
    result: r,
  };
}) satisfies PageLoad;
