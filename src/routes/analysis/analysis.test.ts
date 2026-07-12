import { describe, expect, it } from 'vitest';
import type { BookingAnalysisRowRes } from '$lib/api/core/data-contracts';
import { dateSortKey, groupByDay } from './analysis';

function row(over: Partial<BookingAnalysisRowRes>): BookingAnalysisRowRes {
  return {
    date: '01-07-2026',
    direction: 'WToJ',
    time: '08:00:00',
    ticketsCompleted: 1,
    grossRevenue: 30,
    ...over,
  };
}

describe('dateSortKey', () => {
  it('turns dd-MM-yyyy into a sortable yyyyMMdd key', () => {
    expect(dateSortKey('05-07-2026')).toBe('20260705');
    expect(dateSortKey('31-12-2025')).toBe('20251231');
  });

  it('orders across month/year boundaries correctly', () => {
    // plain string comparison of dd-MM-yyyy would get these wrong
    expect(dateSortKey('01-07-2026') > dateSortKey('30-06-2026')).toBe(true);
    expect(dateSortKey('01-01-2026') > dateSortKey('31-12-2025')).toBe(true);
  });

  it('returns "" for malformed dates', () => {
    expect(dateSortKey('2026-07-01')).toBe('');
    expect(dateSortKey('')).toBe('');
    expect(dateSortKey('garbage')).toBe('');
  });
});

describe('groupByDay', () => {
  it('returns empty for no rows', () => {
    expect(groupByDay([])).toEqual([]);
  });

  it('groups rows by date with per-day totals', () => {
    const groups = groupByDay([
      row({ date: '01-07-2026', time: '08:00:00', ticketsCompleted: 2, grossRevenue: 60 }),
      row({ date: '01-07-2026', time: '17:00:00', direction: 'JToW', ticketsCompleted: 1, grossRevenue: 35 }),
      row({ date: '02-07-2026', time: '08:00:00', ticketsCompleted: 3, grossRevenue: 90 }),
    ]);

    expect(groups).toHaveLength(2);
    // newest day first
    expect(groups[0].date).toBe('02-07-2026');
    expect(groups[0].tickets).toBe(3);
    expect(groups[0].gross).toBe(90);
    expect(groups[1].date).toBe('01-07-2026');
    expect(groups[1].tickets).toBe(3);
    expect(groups[1].gross).toBe(95);
    expect(groups[1].slots).toHaveLength(2);
  });

  it('sorts days newest first across month boundaries', () => {
    const groups = groupByDay([row({ date: '30-06-2026' }), row({ date: '01-07-2026' }), row({ date: '15-06-2026' })]);
    expect(groups.map(g => g.date)).toEqual(['01-07-2026', '30-06-2026', '15-06-2026']);
  });

  it('sorts slots within a day by time then direction', () => {
    const groups = groupByDay([
      row({ time: '17:00:00', direction: 'WToJ' }),
      row({ time: '08:00:00', direction: 'WToJ' }),
      row({ time: '08:00:00', direction: 'JToW' }),
    ]);
    expect(groups[0].slots.map(s => `${s.time} ${s.direction}`)).toEqual([
      '08:00:00 JToW',
      '08:00:00 WToJ',
      '17:00:00 WToJ',
    ]);
  });

  it('merges duplicate (direction, time) rows within a day', () => {
    const groups = groupByDay([
      row({ ticketsCompleted: 2, grossRevenue: 60 }),
      row({ ticketsCompleted: 1, grossRevenue: 30 }),
    ]);
    expect(groups[0].slots).toHaveLength(1);
    expect(groups[0].slots[0].tickets).toBe(3);
    expect(groups[0].slots[0].gross).toBe(90);
    expect(groups[0].tickets).toBe(3);
    expect(groups[0].gross).toBe(90);
  });
});
