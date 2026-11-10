import { describe, expect, it } from 'vitest';
import type { SchedulePrincipalRes } from '$lib/api/core/data-contracts';
import {
  dateSpan,
  detailSchedule,
  indexSchedule,
  isAwaitingRelease,
  isDirectionAwaitingRelease,
  shouldLabelBooking,
} from './release';

const row = (over: Partial<SchedulePrincipalRes> = {}): SchedulePrincipalRes => ({
  date: '10-12-2026',
  confirmed: true,
  jToWExcluded: [],
  wToJExcluded: [],
  ...over,
});

describe('isAwaitingRelease', () => {
  it('is awaiting when the date has no schedule row', () => {
    expect(isAwaitingRelease({}, '10-12-2026', '08:00:00', 'WToJ')).toBe(true);
  });

  it('is released when the date has a row that does not exclude the time', () => {
    const s = indexSchedule([row()]);
    expect(isAwaitingRelease(s, '10-12-2026', '08:00:00', 'WToJ')).toBe(false);
    expect(isAwaitingRelease(s, '10-12-2026', '08:00:00', 'JToW')).toBe(false);
  });

  it('is awaiting when the time is excluded for its direction only', () => {
    const s = indexSchedule([row({ wToJExcluded: ['08:00:00'], jToWExcluded: ['09:00:00'] })]);
    expect(isAwaitingRelease(s, '10-12-2026', '08:00:00', 'WToJ')).toBe(true);
    expect(isAwaitingRelease(s, '10-12-2026', '08:00:00', 'JToW')).toBe(false);
    expect(isAwaitingRelease(s, '10-12-2026', '09:00:00', 'JToW')).toBe(true);
  });

  it('treats a not-yet-released month (every time excluded) as awaiting', () => {
    const times = ['07:00:00', '08:00:00'];
    const s = indexSchedule([row({ wToJExcluded: times, jToWExcluded: times })]);
    expect(isAwaitingRelease(s, '10-12-2026', '07:00:00', 'WToJ')).toBe(true);
    expect(isAwaitingRelease(s, '10-12-2026', '08:00:00', 'JToW')).toBe(true);
  });

  it('tolerates null excluded lists', () => {
    const s = indexSchedule([row({ wToJExcluded: null, jToWExcluded: null })]);
    expect(isAwaitingRelease(s, '10-12-2026', '08:00:00', 'WToJ')).toBe(false);
  });
});

describe('indexSchedule', () => {
  it('keys rows by date and skips rows without one', () => {
    const s = indexSchedule([row(), row({ date: null }), row({ date: '11-12-2026' })]);
    expect(Object.keys(s).sort()).toEqual(['10-12-2026', '11-12-2026']);
    expect(indexSchedule(null)).toEqual({});
  });
});

describe('detailSchedule', () => {
  it('indexes a confirmed detail-endpoint row by its date', () => {
    const s = detailSchedule(row());
    expect(s).toEqual({ '10-12-2026': row() });
  });

  it("drops zinc's synthesized unconfirmed row for unreleased dates", () => {
    // GET /Schedule/{Date} answers {confirmed:false, excluded:[]} when no row exists.
    expect(detailSchedule(row({ confirmed: false, jToWExcluded: [], wToJExcluded: [] }))).toEqual({});
    expect(detailSchedule(null)).toEqual({});
  });

  it('drops a row without a date', () => {
    expect(detailSchedule(row({ date: null }))).toEqual({});
  });
});

describe('isDirectionAwaitingRelease', () => {
  const timings = ['07:00:00', '08:00:00'];

  it('is awaiting when the date has no schedule row', () => {
    expect(isDirectionAwaitingRelease({}, '10-12-2026', 'WToJ', timings)).toBe(true);
  });

  it('is released when any timing is still included for the direction', () => {
    const s = indexSchedule([row({ wToJExcluded: ['07:00:00'] })]);
    expect(isDirectionAwaitingRelease(s, '10-12-2026', 'WToJ', timings)).toBe(false);
    expect(isDirectionAwaitingRelease(s, '10-12-2026', 'JToW', timings)).toBe(false);
  });

  it('is awaiting when every timing is excluded (not-yet-released month)', () => {
    const s = indexSchedule([row({ wToJExcluded: timings })]);
    expect(isDirectionAwaitingRelease(s, '10-12-2026', 'WToJ', timings)).toBe(true);
    expect(isDirectionAwaitingRelease(s, '10-12-2026', 'JToW', timings)).toBe(false);
  });

  it('is not awaiting when there are no timings to exclude', () => {
    expect(isDirectionAwaitingRelease(indexSchedule([row()]), '10-12-2026', 'WToJ', [])).toBe(false);
  });
});

describe('shouldLabelBooking', () => {
  const booking = { date: '10-12-2026', time: '08:00:00', direction: 'WToJ' };

  it('labels Pending bookings that are awaiting release', () => {
    expect(shouldLabelBooking({ ...booking, status: 'Pending' }, {})).toBe(true);
  });

  it('never labels non-Pending bookings', () => {
    for (const status of ['Buying', 'Completed', 'Cancelled', 'Refunded', 'Terminated']) {
      expect(shouldLabelBooking({ ...booking, status }, {})).toBe(false);
    }
  });

  it('does not label a Pending booking whose trip is released', () => {
    expect(shouldLabelBooking({ ...booking, status: 'Pending' }, indexSchedule([row()]))).toBe(false);
  });
});

describe('dateSpan', () => {
  it('returns the min and max dates across months and years', () => {
    expect(dateSpan(['05-01-2027', '28-12-2026', '10-12-2026'])).toEqual({ from: '10-12-2026', to: '05-01-2027' });
  });

  it('handles a single date and an empty list', () => {
    expect(dateSpan(['10-12-2026'])).toEqual({ from: '10-12-2026', to: '10-12-2026' });
    expect(dateSpan([])).toBeNull();
  });
});
