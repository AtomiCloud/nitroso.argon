import { describe, expect, it } from 'vitest';
import { filterTimesAfterBookingCutoff, parseZincDate, singaporeToday, toZincDate } from './singapore';

describe('Singapore schedule clock', () => {
  it('uses the same Singapore day and cutoff in UTC SSR and LA runtimes', () => {
    const originalTimeZone = process.env.TZ;
    const now = new Date('2026-07-10T02:42:00Z'); // 10-Jul 10:42 SGT
    const times = ['08:30:00', '09:45:00', '13:42:00', '13:45:00', '14:00:00'];

    try {
      for (const runtimeTimeZone of ['UTC', 'America/Los_Angeles']) {
        process.env.TZ = runtimeTimeZone;
        expect(toZincDate(singaporeToday(now))).toBe('10-07-2026');
        expect(filterTimesAfterBookingCutoff('10-07-2026', times, now)).toEqual(['13:45:00', '14:00:00']);
      }
    } finally {
      if (originalTimeZone == null) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    }
  });

  it('uses the Singapore calendar day when UTC and LA are still on the previous day', () => {
    const instant = new Date('2026-07-09T16:01:00Z'); // 10-Jul 00:01 SGT; 09-Jul in UTC and LA
    expect(toZincDate(singaporeToday(instant))).toBe('10-07-2026');
  });

  it('filters both sides of midnight and excludes a departure exactly at the cutoff', () => {
    const now = new Date('2026-07-10T15:30:00Z'); // 10-Jul 23:30 SGT; cutoff is 11-Jul 02:30 SGT

    expect(filterTimesAfterBookingCutoff('10-07-2026', ['23:45:00'], now)).toEqual([]);
    expect(
      filterTimesAfterBookingCutoff('11-07-2026', ['00:30:00', '02:29:00', '02:30:00', '02:31:00', '05:00:00'], now),
    ).toEqual(['02:31:00', '05:00:00']);
  });

  it('round-trips Zinc calendar dates', () => {
    expect(toZincDate(parseZincDate('09-11-2026'))).toBe('09-11-2026');
  });
});
