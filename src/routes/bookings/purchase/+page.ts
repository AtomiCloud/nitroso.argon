import type { CostSummaryRes, PassengerPrincipalRes, PriorityEligibilityRes } from '$lib/api/core/data-contracts';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import type { PageLoad } from './$types';
import type { ProblemDetails } from '../../../errors/problem_details';
import { NewApi } from '../../../store';
import { Res } from '$lib/core/result';
import { LIVE_PRICING_DEPENDENCY } from '$lib/api/cost';
import { filterTimesAtOrAfterBookingCutoff } from '$lib/time/singapore';
import { redirect } from '@sveltejs/kit';

export const load = (async ({
  parent,
  url,
  fetch,
  depends,
}): Promise<{
  result: ['err', ProblemDetails[]] | ['ok', [PassengerPrincipalRes[], CostSummaryRes]];
  eligibility: PriorityEligibilityRes;
}> => {
  depends(LIVE_PRICING_DEPENDENCY);
  const { session, user, locale } = await parent();

  const date = url.searchParams.get('date') ?? '';
  const time = url.searchParams.get('time') ?? '';
  const direction = url.searchParams.get('direction') ?? '';
  if (date && time && !filterTimesAtOrAfterBookingCutoff(date, [time], new Date()).includes(time)) {
    const scheduleQuery = new URLSearchParams({ date, direction: direction || 'WToJ' });
    throw redirect(302, `/schedules?${scheduleQuery}`);
  }

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
        Date: date,
        Time: time,
        Direction: direction,
      }),
    await loadError(locale, 'errors.load.cost'),
  );

  // The priority opt-in is a bonus — if the eligibility read fails, the
  // purchase flow must still work, so degrade to "not eligible". The slot
  // being bought rides along (same zinc formats the cost summary sends) so
  // hour-bounded policies and the slot cap apply to THIS timeslot; an older
  // zinc simply ignores the extra params.
  const eligibility = await toResult(
    () =>
      api.vBookingPriorityEligibilityDetail(
        '1',
        date && time && direction ? { Direction: direction, Date: date, Time: time } : undefined,
      ),
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
