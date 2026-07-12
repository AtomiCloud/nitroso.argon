// Pure grouping helpers for the /analysis page. Zinc returns one row per
// (SGT completion date, direction, departure time); the daily table groups
// them client-side into per-day sections with per-slot breakdown rows.
import type { BookingAnalysisRowRes } from '$lib/api/core/data-contracts';

export type SlotRow = {
  direction: string;
  time: string;
  tickets: number;
  gross: number;
};

export type DayGroup = {
  /** zinc wire format, dd-MM-yyyy */
  date: string;
  tickets: number;
  gross: number;
  slots: SlotRow[];
};

/** dd-MM-yyyy → a lexicographically sortable yyyyMMdd key ("" if malformed). */
export function dateSortKey(date: string): string {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date);
  return m ? `${m[3]}${m[2]}${m[1]}` : '';
}

/**
 * Group analysis rows into per-day sections, newest day first (the owner
 * reads this as "how did we do recently"). Within a day, slots are ordered
 * by departure time then direction; duplicate (direction, time) rows are
 * merged defensively even though zinc pre-groups them.
 */
export function groupByDay(rows: BookingAnalysisRowRes[]): DayGroup[] {
  const days = new Map<string, Map<string, SlotRow>>();
  for (const r of rows) {
    let slots = days.get(r.date);
    if (slots == null) {
      slots = new Map();
      days.set(r.date, slots);
    }
    const key = `${r.time}|${r.direction}`;
    const existing = slots.get(key);
    if (existing == null) {
      slots.set(key, {
        direction: r.direction,
        time: r.time,
        tickets: r.ticketsCompleted,
        gross: r.grossRevenue,
      });
    } else {
      existing.tickets += r.ticketsCompleted;
      existing.gross += r.grossRevenue;
    }
  }

  return [...days.entries()]
    .sort(([a], [b]) => dateSortKey(b).localeCompare(dateSortKey(a)))
    .map(([date, slots]) => {
      const list = [...slots.values()].sort(
        (a, b) => a.time.localeCompare(b.time) || a.direction.localeCompare(b.direction),
      );
      return {
        date,
        tickets: list.reduce((s, x) => s + x.tickets, 0),
        gross: list.reduce((s, x) => s + x.gross, 0),
        slots: list,
      };
    });
}
