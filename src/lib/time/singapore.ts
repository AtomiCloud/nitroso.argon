import { CalendarDate, CalendarDateTime, fromDate, toCalendarDate, toZoned } from '@internationalized/date';

export const SINGAPORE_TIME_ZONE = 'Asia/Singapore';
export const BOOKING_CUTOFF_MINUTES = 3 * 60;

/** The Singapore calendar day containing an absolute instant. */
export function singaporeToday(now: Date = new Date()): CalendarDate {
  return toCalendarDate(fromDate(now, SINGAPORE_TIME_ZONE));
}

/** Zinc's date wire format is dd-MM-yyyy. */
export function toZincDate(date: CalendarDate): string {
  return `${String(date.day).padStart(2, '0')}-${String(date.month).padStart(2, '0')}-${date.year}`;
}

export function parseZincDate(value: string): CalendarDate {
  const [day, month, year] = value.split('-').map(part => Number.parseInt(part, 10));
  return new CalendarDate(year, month, day);
}

/**
 * `formatCalendarDate` reads a Date's runtime-local calendar fields. Preserve
 * the floating CalendarDate fields rather than converting midnight SGT into
 * an absolute instant, which would display as the previous day in UTC/LA.
 */
export function calendarDateForDisplay(date: Pick<CalendarDate, 'year' | 'month' | 'day'>): Date {
  return new Date(date.year, date.month - 1, date.day);
}

function departureInstant(date: CalendarDate, time: string): Date {
  const [hour, minute, second = 0] = time.split(':').map(part => Number.parseInt(part, 10));
  const wallClock = new CalendarDateTime(date.year, date.month, date.day, hour, minute, second);
  return toZoned(wallClock, SINGAPORE_TIME_ZONE).toDate();
}

/**
 * Keep departures at or after the booking cutoff. Comparing absolute
 * instants (rather than time-only strings) also handles a cutoff that crosses
 * midnight into the selected date.
 */
export function filterTimesAtOrAfterBookingCutoff(
  date: string,
  times: string[],
  now: Date = new Date(),
  cutoffMinutes: number = BOOKING_CUTOFF_MINUTES,
): string[] {
  const scheduleDate = parseZincDate(date);
  const cutoff = now.getTime() + cutoffMinutes * 60_000;
  return times.filter(time => departureInstant(scheduleDate, time).getTime() >= cutoff);
}
