import type { MaterializedCostRes, PassengerPrincipalRes } from '$lib/api/core/data-contracts';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import type { PageLoad } from './$types';
import type { ProblemDetails } from '../../../errors/problem_details';
import { NewApi } from '../../../store';
import { Res } from '$lib/core/result';

export const load = (async ({
  parent,
  url,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails[]] | ['ok', [PassengerPrincipalRes[], MaterializedCostRes]];
}> => {
  const { session, user, locale } = await parent();

  const api = NewApi({ data: { session }, fetch });
  const userId = session.roles?.includes('admin') ? undefined : (user?.principal.id ?? '');

  const passengers = await toResult(
    () =>
      api.vPassengerDetail('1', {
        UserId: userId,
      }),
    await loadError(locale, 'errors.load.passengers'),
  );

  const cost = toResult(() => api.vCostSelfDetail('1'), await loadError(locale, 'errors.load.cost'));

  const result = await Res.all(passengers, cost).serial();

  return {
    result,
  };
}) satisfies PageLoad;
