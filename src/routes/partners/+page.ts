import type { ProblemDetails } from '../../errors/problem_details';
import type { UserPrincipalRes } from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import { Res } from '$lib/core/result';
import type { PageLoad } from './$types';

// Server-side load for /partners. Two payloads: the partners list (every
// user with the 'partner' extraRole) and the user-search index used to tag
// new partners from. Both fail independently — losing the search index just
// hides the tag-as-partner form, but losing the partners list blanks the
// page. Res.all collapses both into a serial result.
export const load = (async ({
  parent,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails[]] | ['ok', [UserPrincipalRes[], UserPrincipalRes[]]];
}> => {
  const { session, locale } = await parent();

  const api = NewApi({ data: { session }, fetch });

  const partners = toResult(() => api.vUserPartnersDetail('1'), await loadError(locale, 'errors.load.partners'));
  // Re-use the same admin search the /users page uses. We pull a
  // broad sample (Limit: 100, no filter) so the admin can pick from the
  // recent-user pool without typing. The tag form filters client-side.
  const candidates = toResult(() => api.vUserDetail('1', { Limit: 100 }), await loadError(locale, 'errors.load.users'));

  const result = await Res.all(partners, candidates).serial();
  return { result };
}) satisfies PageLoad;
