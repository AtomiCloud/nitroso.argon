import type { SchedulePrincipalRes } from '$lib/api/core/data-contracts';
import { parse, format } from 'date-fns';

/**
 * "Awaiting release" = KTMB has not opened this date/time/direction yet.
 *
 * Customers may still pre-order such trips, so this is only used to *label*
 * them. zinc's Schedule API lists the open dates; a date with no row, or a
 * time in that row's excluded list for the direction, is not released
 * (KTMB shows not-yet-released months as "no trains", which zinc stores as
 * every time excluded).
 */

export type ReleaseDirection = 'JToW' | 'WToJ';

/** Schedule rows keyed by their 'dd-mm-yyyy' date. */
export type ScheduleByDate = Record<string, SchedulePrincipalRes>;

const ZINC_DATE = 'dd-MM-yyyy';

/** Index schedule rows by date. Rows without a date are ignored. */
export function indexSchedule(rows: SchedulePrincipalRes[] | null | undefined): ScheduleByDate {
  const out: ScheduleByDate = {};
  for (const row of rows ?? []) {
    if (row.date) out[row.date] = row;
  }
  return out;
}

/** True when `time` ('HH:mm:ss') on `date` ('dd-mm-yyyy') is not released for `direction`. */
export function isAwaitingRelease(
  schedule: ScheduleByDate,
  date: string,
  time: string,
  direction: string | null | undefined,
): boolean {
  const row = schedule[date];
  if (row == null) return true;
  const excluded = (direction === 'JToW' ? row.jToWExcluded : row.wToJExcluded) ?? [];
  return excluded.includes(time);
}

/** Only Pending bookings are labelled: later statuses are already past the wait. */
export function shouldLabelBooking(
  booking: { status?: string | null; date?: string | null; time?: string | null; direction?: string | null },
  schedule: ScheduleByDate,
): boolean {
  if (booking.status !== 'Pending' || !booking.date || !booking.time) return false;
  return isAwaitingRelease(schedule, booking.date, booking.time, booking.direction);
}

/** Smallest and largest 'dd-mm-yyyy' dates, or null when there are none / none parse. */
export function dateSpan(dates: string[]): { from: string; to: string } | null {
  const parsed = dates
    .map(d => parse(d, ZINC_DATE, new Date(0)))
    .filter(d => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (parsed.length === 0) return null;
  return { from: format(parsed[0], ZINC_DATE), to: format(parsed[parsed.length - 1], ZINC_DATE) };
}
