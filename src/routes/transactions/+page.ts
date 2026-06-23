import type { ProblemDetails } from '../../errors/problem_details';
import type { TransactionPrincipalRes, WalletPrincipalRes } from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import type { PageLoad } from './$types';

export const load = (async ({
  parent,
  url,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails] | ['ok', TransactionPrincipalRes[]];
}> => {
  const { session, locale } = await parent();

  const api = NewApi({ data: { session }, fetch });

  const search = url.searchParams.get('search') ?? '';
  const userId = url.searchParams.get('userId') ?? '';
  const after = url.searchParams.get('after') ?? '';
  const before = url.searchParams.get('before') ?? '';
  const transactionType = url.searchParams.get('transactionType') ?? '';

  const r = await toResult(
    () =>
      api.vTransactionDetail('1', {
        userId,
        Search: search,
        After: after,
        Before: before,
        TransactionType: transactionType,
      }),
    await loadError(locale, 'errors.load.transactions'),
  ).serial();
  return {
    result: r,
  };
}) satisfies PageLoad;
