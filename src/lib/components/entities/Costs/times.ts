// Shared tap-friendly time options for the cost/priority admin UIs — the
// owner mandate is "no typing where a tap works", so times are always picked
// from a SELECT, never typed.

// Every half hour of the day, zinc's HH:mm:ss wire format.
export const HALF_HOURS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}:00`;
});

// The standard lead-time buckets (hours) offered for "lead time under" matchers.
export const LEAD_TIME_HOURS = [6, 12, 24, 48, 72, 96];

// Day-of-week values zinc accepts, Monday-first (i18n via stats.days.*).
export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Ensures a previously saved value is still offered by its select, even when
// it is no longer part of the base option list (e.g. a retired schedule slot).
export function withValue(options: string[], value: string | null | undefined): string[] {
  if (value == null || value === '' || options.includes(value)) return options;
  return [value, ...options];
}
