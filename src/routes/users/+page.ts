import type { ProblemDetails } from '../../errors/problem_details';
import type { UserPrincipalRes } from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import type { PageLoad } from './$types';

export const load = (async ({
  parent,
  url,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails] | ['ok', UserPrincipalRes[]];
}> => {
  const { session, locale } = await parent();

  const api = NewApi({ data: { session }, fetch });

  const usernameSearch = url.searchParams.get('username') ?? '';
  const userIdSearch = url.searchParams.get('userId') ?? '';
  const emailSearch = url.searchParams.get('email') ?? '';

  // Build query parameters based on what's provided
  const queryParams: any = { Limit: 100 };
  if (usernameSearch) queryParams.Username = usernameSearch;
  if (userIdSearch) queryParams.Id = userIdSearch;
  if (emailSearch) queryParams.Email = emailSearch;

  const r = await toResult(
    () => api.vUserDetail('1', queryParams),
    await loadError(locale, 'errors.load.users'),
  ).serial();
  return {
    result: r,
  };
}) satisfies PageLoad;
