/**
 * Locale-aware formatting helpers (FR12).
 *
 * SSR-safe by construction: every function takes the active locale explicitly
 * (pass `$lang` from `$lib/i18n`) and uses the stateless `Intl` APIs. They never
 * read svelte-i18n's process-global `$locale`, so a server render is always
 * driven by the request-scoped locale and can never bleed across requests.
 *
 * Use these for the FR12 values — booking dates/times, costs/prices, wallet
 * balances, and transaction amounts/dates — instead of ad-hoc
 * `toLocaleString()`/`toFixed()` calls.
 */
import type { SupportedLocale } from './resolve';

/**
 * Map an app locale to the richest BCP-47 tag we want `Intl` to use. We pin a
 * region so currency/number grouping and date order are stable and unambiguous:
 *   - `en` → `en-SG` (the app's home market)
 *   - `zh` → `zh-SG` (Simplified, Singapore conventions)
 *   - `ms` → `ms-MY`
 */
const INTL_LOCALE: Record<SupportedLocale, string> = {
  en: 'en-SG',
  zh: 'zh-SG',
  ms: 'ms-MY',
};

/** The app operates out of Singapore; timestamps are presented in SGT. */
const APP_TIME_ZONE = 'Asia/Singapore';

function tag(locale: SupportedLocale): string {
  return INTL_LOCALE[locale] ?? INTL_LOCALE.en;
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Format a monetary amount in locale-appropriate form (FR12).
 * Defaults to SGD, the app's settlement currency.
 */
export function formatMoney(
  amount: number,
  locale: SupportedLocale,
  options: { currency?: string } & Intl.NumberFormatOptions = {},
): string {
  const { currency = 'SGD', ...rest } = options;
  return new Intl.NumberFormat(tag(locale), { style: 'currency', currency, ...rest }).format(amount);
}

/** Format a plain number with locale-appropriate grouping/decimals. */
export function formatNumber(value: number, locale: SupportedLocale, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(tag(locale), options).format(value);
}

/** Format a calendar date (no time component) in locale-appropriate form. */
export function formatDate(
  value: Date | string | number,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat(tag(locale), {
    dateStyle: 'medium',
    timeZone: APP_TIME_ZONE,
    ...options,
  }).format(toDate(value));
}

/** Format a date with time in locale-appropriate form. */
export function formatDateTime(
  value: Date | string | number,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat(tag(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: APP_TIME_ZONE,
    ...options,
  }).format(toDate(value));
}

/** Format a clock time only in locale-appropriate form. */
export function formatTime(
  value: Date | string | number,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat(tag(locale), {
    timeStyle: 'short',
    timeZone: APP_TIME_ZONE,
    ...options,
  }).format(toDate(value));
}

/**
 * Format a "floating" clock time — a wall-clock label with no date and no
 * timezone, such as a booking/schedule slot ("13:00:00" always means 1pm,
 * wherever the page renders). The clock components are anchored to UTC and
 * formatted in UTC so the label survives ANY runtime timezone.
 *
 * Do NOT use `formatTime` for these: it parses the value as an instant in the
 * runtime's local zone and then pins the output to Asia/Singapore, which shifts
 * the displayed time for any non-SG runtime (e.g. a slot of 13:00 renders as
 * 04:30 on an America/Los_Angeles host). `formatTime` is correct only for real
 * instants (an ISO timestamp from the API). Accepts "HH:mm" or "HH:mm:ss".
 */
export function formatClockTime(
  time: string | null | undefined,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const [h, m, s] = (time ?? '').split(':');
  const date = new Date(Date.UTC(1970, 0, 1, Number(h) || 0, Number(m) || 0, Number(s) || 0));
  return new Intl.DateTimeFormat(tag(locale), { timeStyle: 'short', timeZone: 'UTC', ...options }).format(date);
}

/**
 * Format a "floating" calendar date — a calendar day with no time and no
 * timezone, such as a booking date or passport expiry. The local calendar day
 * is re-anchored to UTC midnight and formatted in UTC, so the rendered day
 * never shifts when the runtime zone differs from Asia/Singapore.
 *
 * Pass a `Date` that already represents the intended day at local midnight —
 * which is exactly what `date-fns parse(…, new Date())` and
 * `DateValue.toDate(getLocalTimeZone())` produce. Use `formatDate` /
 * `formatDateTime` instead for real instants (an ISO timestamp), which SHOULD
 * be presented in SGT.
 */
export function formatCalendarDate(
  value: Date,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const utc = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  return new Intl.DateTimeFormat(tag(locale), { dateStyle: 'medium', timeZone: 'UTC', ...options }).format(utc);
}
