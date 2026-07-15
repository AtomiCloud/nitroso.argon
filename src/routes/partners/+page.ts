import type { ProblemDetails } from '../../errors/problem_details';
import type { UserPrincipalRes } from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import type { PageLoad } from './$types';

// Server-side load for /partners. Two independent payloads:
//   1. partners  — every user with the 'partner' extraRole. The page can
//      NOT render without this; a failure here blanks the page.
//   2. candidates — the recent-user pool the tag-as-partner form picks
//      from. A failure here ONLY hides the tag form; the partners list
//      and P&L table still render. We intentionally do NOT use Res.all
//      (which would collapse both into a single failure).
export const load = (async ({
  parent,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails] | ['ok', [UserPrincipalRes[], UserPrincipalRes[]]];
}> => {
  const { session, locale } = await parent();

  const api = NewApi({ data: { session }, fetch });

  // Partners list is the hard requirement.
  const partnersSerial = await toResult(
    () => api.vUserPartnersDetail('1'),
    await loadError(locale, 'errors.load.partners'),
  ).serial();
  if (partnersSerial[0] === 'err') {
    return { result: partnersSerial as ['err', ProblemDetails] };
  }

  // Tag-as-partner candidates: soft requirement. On failure, fall back to
  // an empty list so the page still renders the partners + P&L table.
  const candidatesSerial = await toResult(
    () => api.vUserDetail('1', { Limit: 100 }),
    await loadError(locale, 'errors.load.users'),
  ).serial();
  const candidates: UserPrincipalRes[] = candidatesSerial[0] === 'ok' ? candidatesSerial[1] : [];

  return {
    result: ['ok', [partnersSerial[1], candidates]] as ['ok', [UserPrincipalRes[], UserPrincipalRes[]]],
  };
}) satisfies PageLoad;
