import type { CostSummaryRes, PassengerPrincipalRes, PriorityEligibilityRes } from '$lib/api/core/data-contracts';
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
  result: ['err', ProblemDetails[]] | ['ok', [PassengerPrincipalRes[], CostSummaryRes]];
  eligibility: PriorityEligibilityRes;
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

  // Priced for THIS booking spec (date/time/direction), so the shown price
  // always matches what zinc will charge once cost policies exist.
  const cost = toResult(
    () =>
      api.vCostSummaryDetail('1', {
        Date: url.searchParams.get('date') ?? '',
        Time: url.searchParams.get('time') ?? '',
        Direction: url.searchParams.get('direction') ?? '',
      }),
    await loadError(locale, 'errors.load.cost'),
  );

  // The priority opt-in is a bonus — if the eligibility read fails, the
  // purchase flow must still work, so degrade to "not eligible".
  const eligibility = await toResult(
    () => api.vBookingPriorityEligibilityDetail('1'),
    await loadError(locale, 'errors.load.priority'),
  ).match({
    ok: (e: PriorityEligibilityRes) => e,
    err: (e): PriorityEligibilityRes => {
      console.error(e);
      return { eligible: false, fee: 0 };
    },
  });

  const result = await Res.all(passengers, cost).serial();

  return {
    result,
    eligibility,
  };
}) satisfies PageLoad;
