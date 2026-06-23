import type { PageLoad } from './$types';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import type { ProblemDetails } from '../../../errors/problem_details';
import { NewApi } from '../../../store';
import type { UserRes } from '$lib/api/core/data-contracts';

export const load = (async ({
  params,
  parent,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails] | ['ok', UserRes];
}> => {
  const data = await parent();
  const api = NewApi({ data, fetch });

  const userId = params.user_id;

  const r = await toResult(
    () => api.vUserDetail2(userId, '1'),
    await loadError(data.locale, 'errors.load.user'),
  ).serial();

  return {
    result: r,
  };
}) satisfies PageLoad;
