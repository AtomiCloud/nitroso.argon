import type { ProblemDetails } from '../../errors/problem_details';
import type { BookingPrincipalRes } from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import type { PageLoad } from './$types';

export const load = (async ({
  parent,
  url,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails] | ['ok', BookingPrincipalRes[]];
}> => {
  const { session, locale } = await parent();

  const api = NewApi({ data: { session }, fetch });

  const userId = url.searchParams.get('userId') ?? '';

  const date = url.searchParams.get('date') ?? '';
  const direction = url.searchParams.get('direction') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const time = url.searchParams.get('time') ?? '';

  const r = await toResult(
    () =>
      api.vBookingDetail('1', {
        UserId: userId,
        Date: date,
        Direction: direction,
        Status: status,
        Time: time,
        Limit: 100,
      }),
    await loadError(locale, 'errors.load.bookings'),
  ).serial();
  return {
    result: r,
  };
}) satisfies PageLoad;
