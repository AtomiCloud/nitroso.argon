import type { ProblemDetails } from '../../errors/problem_details';
import type { PassengerPrincipalRes } from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import type { PageLoad } from './$types';

export const load = (async ({
  parent,
  url,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails] | ['ok', PassengerPrincipalRes[]];
}> => {
  const { session, locale } = await parent();

  const api = NewApi({ data: { session }, fetch });

  const search = url.searchParams.get('search') ?? '';
  const userId = url.searchParams.get('userId') ?? '';

  const r = await toResult(
    () =>
      api.vPassengerDetail('1', {
        UserId: userId,
        Name: search,
      }),
    await loadError(locale, 'errors.load.passengers'),
  ).serial();
  return {
    result: r,
  };
}) satisfies PageLoad;
