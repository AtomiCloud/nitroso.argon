import type { ProblemDetails } from '../../errors/problem_details';
import type {
  BookingCountRes,
  CostSlotSummaryRes,
  SchedulePrincipalRes,
  TimingRes,
} from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import type { PageLoad } from './$types';
import { Res } from '$lib/core/result';
import type { Timings } from './typing';
import { redirect } from '@sveltejs/kit';
import { filterTimesAtOrAfterBookingCutoff, parseZincDate, singaporeToday, toZincDate } from '$lib/time/singapore';

function getTiming(
  direction: 'JToW' | 'WToJ',
  timings: TimingRes,
  schedule: SchedulePrincipalRes,
  date: string,
  now: Date,
): string[] {
  const excluded: string[] = (direction === 'JToW' ? schedule.jToWExcluded : schedule.wToJExcluded) ?? [];

  const t: string[] = timings.principal.timings ?? [];
  const included = t.filter(t => !excluded.includes(t)) ?? [];
  return filterTimesAtOrAfterBookingCutoff(date, included, now);
}

function stitchTiming(timings: string[], res: BookingCountRes[]): Timings {
  return Object.fromEntries(timings.map(x => [x, res.find(c => c.time === x)?.ticketsNeeded ?? 0])) as {
    [s: string]: number;
  };
}

export const load = (async ({
  parent,
  url,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails[]] | ['ok', Timings];
  slotSummaries: CostSlotSummaryRes[] | null;
  slotPricingFailed: boolean;
}> => {
  const { session, locale } = await parent();

  const api = NewApi({ data: { session }, fetch });

  const now = new Date();
  const t = singaporeToday(now);
  const todayDate = toZincDate(t);
  const date: string = url.searchParams.get('date') ?? '';
  const direction: string = url.searchParams.get('direction') ?? '';

  if (date === '' || direction === '') {
    const dd = date === '' ? todayDate : date;
    const dir = direction === '' ? 'WToJ' : direction;
    throw redirect(302, `/schedules?date=${dd}&direction=${dir}`);
  }

  const n = parseZincDate(date);
  if (n.compare(t) < 0) {
    throw redirect(302, `/schedules?date=${todayDate}&direction=${direction}`);
  }

  const schedule = toResult(() => api.vScheduleDetail(date, '1'), await loadError(locale, 'errors.load.schedule'));

  const timing = toResult(() => api.vTimingDetail(direction, '1'), await loadError(locale, 'errors.load.timing'));

  const counts = toResult(
    () => api.vBookingCountsDetail2(date, direction, '1'),
    await loadError(locale, 'errors.load.counts'),
  );

  const result = await Res.all(schedule, timing, counts)
    .map(([s, t, b]) => stitchTiming(getTiming(direction as 'JToW' | 'WToJ', t, s, date, now), b))
    .serial();

  // Per-slot ACTUAL prices from the batch endpoint (priced for the caller,
  // per date/time/direction). Never silently fall back to Cost/self: that
  // endpoint has no slot and intentionally cannot apply lead-time/date/time
  // policies or discounts, so presenting it as the slot price is misleading.
  let slotSummaries: CostSlotSummaryRes[] | null = null;
  let slotPricingFailed = false;
  if (result[0] === 'ok') {
    const times = Object.keys(result[1]).slice(0, 100);
    if (times.length === 0) {
      slotSummaries = [];
    } else {
      slotSummaries = await toResult(
        () =>
          api.vCostSummaryBatchDetail('1', {
            Date: date,
            Direction: direction,
            Times: times.join(','),
          }),
        await loadError(locale, 'errors.load.cost'),
      ).match({
        ok: (b: CostSlotSummaryRes[]) => {
          const returned = new Set(b.map(x => x.time).filter((x): x is string => x != null));
          slotPricingFailed = times.some(time => !returned.has(time));
          return b;
        },
        err: (e): CostSlotSummaryRes[] | null => {
          console.error(e);
          slotPricingFailed = true;
          return null;
        },
      });
    }
  }

  return { result, slotSummaries, slotPricingFailed };
}) satisfies PageLoad;
