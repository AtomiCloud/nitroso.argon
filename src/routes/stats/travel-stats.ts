// Pure helpers for the "Travel day × time-of-day" tab on /stats. Zinc
// returns a flat array of non-empty (date, direction, 6h bucket) rows;
// everything here is a deterministic client-side pivot/groupBy over those
// rows so the view stays a small render over one fetch. The same grid is
// reused with both directions merged per cell — see the page render.
import type { TravelAnalysisBucketRes } from '$lib/api/core/data-contracts';

// quarterStartHour from zinc is always 0, 6, 12 or 18; the canonical ladder
// is exported so the table column order is stable regardless of the order
// zinc returns rows in
export const QUARTERS: readonly number[] = [0, 6, 12, 18] as const;

// dd-MM-yyyy in, Date (at UTC noon — SGT calendar dates don't carry a time)
// out; returns null on garbage so the caller can drop the row silently
export function parseTravelDate(s: string | null | undefined): Date | null {
  if (s == null) return null;
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (m == null) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return null;
  // round-trip through Date to reject impossible day-of-month (e.g. 31-02)
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d;
}

// one row of the pivoted table
export type TravelDayRow = {
  date: string; // canonical dd-MM-yyyy, zinc's wire format
  isoDate: string; // ISO yyyy-mm-dd for sorting/lookups (never displayed)
  // map keyed by direction → per-quarter ticket counts; missing quarters
  // are absent from the map and read as 0 by the renderer
  byDirection: Record<string, Record<number, number>>;
  total: number; // sum of every bucket on the day (all directions)
};

// pivot zinc's flat rows into one TravelDayRow per travel date, in the order
// zinc returned them (typically ascending). Empty input → empty output.
export function pivotTravelAnalysis(rs: TravelAnalysisBucketRes[]): TravelDayRow[] {
  // preserve insertion order — zinc emits ascending travel dates
  const order: string[] = [];
  const byDate = new Map<string, TravelDayRow>();
  for (const r of rs) {
    let row = byDate.get(r.date);
    if (row == null) {
      row = { date: r.date, isoDate: isoOf(r.date), byDirection: {}, total: 0 };
      byDate.set(r.date, row);
      order.push(r.date);
    }
    const perDir = row.byDirection[r.direction] ?? {};
    // merge duplicate (date, direction, quarter) rows defensively —
    // overwriting the bucket while still adding to the day total would
    // silently desync the grid cells from the Total column
    perDir[r.quarterStartHour] = (perDir[r.quarterStartHour] ?? 0) + r.tickets;
    row.byDirection[r.direction] = perDir;
    row.total += r.tickets;
  }
  return order.map(d => byDate.get(d)!).filter(Boolean);
}

// sum every bucket of one travel-date row. When direction is "" (the only
// state the new grid uses) it returns the grand total across every
// direction; a non-empty direction narrows to that direction's buckets.
export function rowTotal(row: TravelDayRow, direction: string): number {
  if (direction === '') return row.total;
  const perQ = row.byDirection[direction];
  if (perQ == null) return 0;
  let s = 0;
  for (const q of QUARTERS) s += perQ[q] ?? 0;
  return s;
}

// count of tickets in one (row, direction, quarter) cell, defaulting to 0
// for missing buckets so the renderer can read straight from the pivot.
// The grid sums both directions per cell, so the typical call is
// cellCount(r, "WToJ", q) + cellCount(r, "JToW", q).
export function cellCount(row: TravelDayRow, direction: string, quarter: number): number {
  return row.byDirection[direction]?.[quarter] ?? 0;
}

// zinc → ISO yyyy-mm-dd (UTC noon Date from parseTravelDate). Returns ""
// for garbage input rather than throwing — the caller filters empties.
function isoOf(ddMMyyyy: string): string {
  const d = parseTravelDate(ddMMyyyy);
  if (d == null) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
