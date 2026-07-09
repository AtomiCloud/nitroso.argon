import type { ProblemDetails } from '../../errors/problem_details';
import type { BookingPrincipalRes } from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import type { PageLoad } from './$types';

const PAGE_SIZE = 20;

export const load = (async ({
  parent,
  url,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails] | ['ok', BookingPrincipalRes[]];
  page: number;
  sortBy: string;
  hasMore: boolean;
}> => {
  const { session, locale } = await parent();

  const api = NewApi({ data: { session }, fetch });

  const userId = url.searchParams.get('userId') ?? '';

  const date = url.searchParams.get('date') ?? '';
  const direction = url.searchParams.get('direction') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const time = url.searchParams.get('time') ?? '';
  const sortBy = url.searchParams.get('sortBy') ?? '';
  const passengerName = url.searchParams.get('passengerName') ?? '';
  const passportNumber = url.searchParams.get('passportNumber') ?? '';

  const rawPage = parseInt(url.searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const r = await toResult(
    () =>
      api.vBookingDetail('1', {
        UserId: userId,
        Date: date,
        Direction: direction,
        Status: status,
        Time: time,
        PassengerName: passengerName,
        PassportNumber: passportNumber,
        ...(sortBy === '' ? {} : { SortBy: sortBy }),
        Limit: PAGE_SIZE,
        Skip: (page - 1) * PAGE_SIZE,
      }),
    await loadError(locale, 'errors.load.bookings'),
  ).serial();

  // A full page suggests more results after this one; a short page is the end.
  const hasMore = r[0] === 'ok' && r[1].length === PAGE_SIZE;
  return {
    result: r,
    page,
    sortBy,
    hasMore,
  };
}) satisfies PageLoad;
