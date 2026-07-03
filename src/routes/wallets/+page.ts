import type { ProblemDetails } from '../../errors/problem_details';
import type { WalletPrincipalRes } from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import type { PageLoad } from './$types';

export const load = (async ({
  parent,
  url,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails] | ['ok', WalletPrincipalRes[]];
}> => {
  const { session, locale } = await parent();

  const api = NewApi({ data: { session }, fetch });

  const search = url.searchParams.get('search') ?? '';

  const r = await toResult(
    () =>
      api.vWalletDetail('1', {
        UserId: search,
      }),
    await loadError(locale, 'errors.load.wallets'),
  ).serial();
  return {
    result: r,
  };
}) satisfies PageLoad;
