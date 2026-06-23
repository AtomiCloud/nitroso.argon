import type { ProblemDetails } from '../../errors/problem_details';
import type { CostPrincipalRes, WithdrawalPrincipalRes } from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import type { PageLoad } from './$types';

export const load = (async ({
  parent,
  url,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails] | ['ok', CostPrincipalRes[]];
}> => {
  const { session, locale } = await parent();

  const api = NewApi({ data: { session }, fetch });

  const r = await toResult(() => api.vCostDetail('1'), await loadError(locale, 'errors.load.costs')).serial();
  return {
    result: r,
  };
}) satisfies PageLoad;
