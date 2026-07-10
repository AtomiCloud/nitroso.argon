import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  formatNumber,
  formatDate,
  formatDateTime,
  formatTime,
  formatClockTime,
  formatCalendarDate,
} from './format';

// A fixed instant: 2024-01-15T04:00:00Z == 2024-01-15 12:00 (noon) in Asia/Singapore.
// Noon SGT keeps the calendar date stable regardless of the formatter's day boundary.
const INSTANT = new Date('2024-01-15T04:00:00Z');

describe('formatMoney (FR12)', () => {
  it('formats SGD by default with locale-appropriate grouping', () => {
    expect(formatMoney(1234.5, 'en')).toBe('$1,234.50');
    // Malay renders the ISO code rather than the bare "$" glyph.
    expect(formatMoney(1234.5, 'ms')).toContain('SGD');
    expect(formatMoney(1234.5, 'ms')).toContain('1,234.50');
  });

  it('produces a locale-appropriate money string that differs across locales', () => {
    expect(formatMoney(1234.5, 'en')).not.toBe(formatMoney(1234.5, 'ms'));
  });

  it('honours an explicit currency', () => {
    expect(formatMoney(10, 'en', { currency: 'USD' })).toContain('10.00');
  });
});

describe('formatNumber (FR12)', () => {
  it('applies locale grouping', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
  });
});

describe('formatDate (FR12)', () => {
  it('renders the same instant in distinct, locale-appropriate forms', () => {
    const en = formatDate(INSTANT, 'en', { dateStyle: 'long' });
    const zh = formatDate(INSTANT, 'zh', { dateStyle: 'long' });
    const ms = formatDate(INSTANT, 'ms', { dateStyle: 'long' });

    expect(en).toBe('15 January 2024');
    expect(ms).toContain('Januari'); // Malay month name
    expect(zh).toContain('年'); // Chinese year marker

    // All three are genuinely different renderings.
    expect(new Set([en, zh, ms]).size).toBe(3);
  });

  it('accepts ISO strings and numbers, not just Date objects', () => {
    expect(formatDate('2024-01-15T04:00:00Z', 'en', { dateStyle: 'long' })).toBe('15 January 2024');
    expect(formatDate(INSTANT.getTime(), 'en', { dateStyle: 'long' })).toBe('15 January 2024');
  });
});

describe('formatDateTime / formatTime (FR12)', () => {
  it('renders date + time and differs across locales', () => {
    const en = formatDateTime(INSTANT, 'en');
    const zh = formatDateTime(INSTANT, 'zh');
    const ms = formatDateTime(INSTANT, 'ms');
    // Noon SGT for all three (timezone is pinned to Asia/Singapore).
    expect(en).toContain('2024');
    expect(zh).toContain('年');
    expect(new Set([en, zh, ms]).size).toBe(3);
  });

  it('formatTime renders a clock time in SGT', () => {
    // 04:00Z -> 12:00 (noon) SGT
    expect(formatTime(INSTANT, 'en')).toMatch(/12[:.]00/);
  });
});

describe('formatClockTime — floating booking/schedule slot (FR12, TZ-safe)', () => {
  // A booking slot of "13:00:00" must read as 1pm in EVERY runtime timezone.
  // The buggy predecessor (`formatTime(new Date('1970-01-01T13:00:00'))`) parses
  // the value as a local instant and then pins output to Asia/Singapore, so a
  // non-SG host (e.g. this suite runs under America/Los_Angeles in CI) shifts it
  // to a different hour. These assertions are the same in any runtime zone.
  it('preserves the wall-clock hour regardless of runtime timezone', () => {
    // 13:00 -> 1pm, never a shifted hour. Locale chooses the AM/PM rendering.
    expect(formatClockTime('13:00:00', 'en')).toMatch(/\b1[:.]00\s*pm/i);
    expect(formatClockTime('13:00:00', 'zh')).toContain('下午'); // Chinese PM marker
    expect(formatClockTime('13:00:00', 'zh')).toMatch(/1[:.]00/);
    expect(formatClockTime('13:00:00', 'ms')).toMatch(/1[:.]00/);
    // The shifted hour that the old SG-pinned path would produce here must NOT
    // appear (04:30 on this LA-runtime host; varies elsewhere, but never 1pm).
    expect(formatClockTime('13:00:00', 'en')).not.toMatch(/4[:.]30/);
  });

  it('accepts both HH:mm and HH:mm:ss and differs across locales', () => {
    expect(formatClockTime('09:05', 'en')).toBe(formatClockTime('09:05:00', 'en'));
    const en = formatClockTime('13:00:00', 'en');
    const zh = formatClockTime('13:00:00', 'zh');
    expect(en).not.toBe(zh);
  });

  it('honours formatter options (e.g. hourCycle)', () => {
    // schedules passes { hourCycle: 'h12' }; 13:00 -> a 1 o'clock rendering.
    expect(formatClockTime('13:00:00', 'en', { hourCycle: 'h12' })).toMatch(/\b1[:.]00/);
  });

  it('degrades gracefully on a missing/empty value (no throw)', () => {
    expect(() => formatClockTime(null, 'en')).not.toThrow();
    expect(() => formatClockTime(undefined, 'en')).not.toThrow();
  });
});

describe('formatCalendarDate — floating calendar day (FR12, TZ-safe)', () => {
  // `date-fns parse(…, new Date())` and `DateValue.toDate(getLocalTimeZone())`
  // both yield a Date at LOCAL midnight of the intended day. formatCalendarDate
  // re-anchors that day to UTC midnight so the rendered day never shifts, unlike
  // formatDate which pins to Asia/Singapore (correct only for real instants).
  const localMidnight = new Date(2024, 0, 15); // 15 Jan 2024, local midnight

  it('renders the intended calendar day, not shifted by the runtime zone', () => {
    expect(formatCalendarDate(localMidnight, 'en')).toBe('15 Jan 2024');
    expect(formatCalendarDate(localMidnight, 'zh')).toBe('2024年1月15日');
    expect(formatCalendarDate(localMidnight, 'ms')).toBe('15 Jan 2024');
  });

  it('honours dateStyle options used by the pickers', () => {
    expect(formatCalendarDate(localMidnight, 'en', { dateStyle: 'long' })).toBe('15 January 2024');
    expect(formatCalendarDate(localMidnight, 'ms', { dateStyle: 'long' })).toContain('Januari');
  });

  it('supports granular date parts without mixing them with dateStyle', () => {
    expect(
      formatCalendarDate(localMidnight, 'en', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
      }),
    ).toBe('15 Jan 24');
  });
});
