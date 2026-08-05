// Pure helpers for the /analysis page. Zinc returns one row per (SGT
// completion date, direction, departure time) plus a range summary, a
// monthly P&L rollup, a component ranking, the profit-by-travel-day buckets
// and the boost ledger; everything here is client-side shaping of those
// payloads so the page component stays declarative (and the math stays
// unit-testable).
import type {
  BookingAnalysisProfitBucketRes,
  BookingAnalysisRowRes,
  BookingAnalysisSummaryRes,
  BookingBoostRes,
  MonthlyAnalysisRes,
} from '$lib/api/core/data-contracts';
import { withdrawalLossAmount, type TerminalPnlRow } from '$lib/pnl/terminal';

export type SlotRow = {
  direction: string;
  time: string;
  tickets: number;
  gross: number;
  ktmbCost: number;
};

export type DayGroup = {
  /** zinc wire format, dd-MM-yyyy */
  date: string;
  tickets: number;
  gross: number;
  ktmbCost: number;
  slots: SlotRow[];
};

/** dd-MM-yyyy → a lexicographically sortable yyyyMMdd key ("" if malformed). */
export function dateSortKey(date: string): string {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date);
  return m ? `${m[3]}${m[2]}${m[1]}` : '';
}

/** MM-yyyy (zinc's monthly bucket) → a sortable yyyyMM key ("" if malformed). */
export function monthSortKey(month: string): string {
  const m = /^(\d{2})-(\d{4})$/.exec(month);
  return m ? `${m[2]}${m[1]}` : '';
}

/**
 * Group analysis rows into per-day sections, newest day first (the owner
 * reads this as "how did we do recently"). Within a day, slots are ordered
 * by departure time then direction; duplicate (direction, time) rows are
 * merged defensively even though zinc pre-groups them. A missing ktmbCost
 * (old zinc) counts as 0 — the same "never configured" semantics zinc uses.
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
        ktmbCost: r.ktmbCost ?? 0,
      });
    } else {
      existing.tickets += r.ticketsCompleted;
      existing.gross += r.grossRevenue;
      existing.ktmbCost += r.ktmbCost ?? 0;
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
        ktmbCost: list.reduce((s, x) => s + x.ktmbCost, 0),
        slots: list,
      };
    });
}

/** Unique days present in the rows, newest first (the by-day selector's options). */
export function daysPresent(rows: BookingAnalysisRowRes[]): string[] {
  return [...new Set(rows.map(r => r.date))].sort((a, b) => dateSortKey(b).localeCompare(dateSortKey(a)));
}

/**
 * NET over a monthly row: gross − KTMB cost − both gateway fee legs.
 * Internal fees are BunnyBooker's own revenue — context, never subtracted.
 * Zinc sends a precomputed net; prefer it (it is the authoritative decimal
 * arithmetic) and fall back to the same formula for defensive rendering.
 */
export function netOf(
  m: Pick<MonthlyAnalysisRes, 'gross' | 'ktmbCost' | 'gatewayPaymentFees' | 'gatewayPayoutFees'>,
): number {
  return m.gross - m.ktmbCost - m.gatewayPaymentFees - m.gatewayPayoutFees;
}

export function monthNet(m: MonthlyAnalysisRes): number {
  return m.net ?? netOf(m);
}

/**
 * Range NET from the summary — same formula as the monthly rollup, over the
 * whole range. Old zinc (pre PR #39) omits totalKtmbCost/gatewayFees, which
 * count as 0 (the figure degrades to plain gross, matching what that zinc
 * can attribute).
 */
export function rangeNet(s: BookingAnalysisSummaryRes): number {
  return s.totalGross - (s.totalKtmbCost ?? 0) - (s.gatewayFees?.payments ?? 0) - (s.gatewayFees?.payouts ?? 0);
}

/** Monthly rows sorted newest month first for the P&L table. */
export function sortMonthly(monthly: MonthlyAnalysisRes[]): MonthlyAnalysisRes[] {
  return [...monthly].sort((a, b) => monthSortKey(b.month).localeCompare(monthSortKey(a.month)));
}

// ---- withdrawal cost join (Monthly tab columns + Overview card) ----
// The Monthly P&L table and the Overview stat card surface the withdrawal
// channel cost from the SAME terminal endpoint the Withdrawals tab uses,
// joined onto the analysis monthly rollup by MM-yyyy month. Pure + tested so
// the join (and its zero-default for an unmatched month) stays correct as both
// payloads evolve.

export type MonthlyWithdrawalCost = {
  /** net withdrawal cost for the month (positive = a loss BunnyBooker absorbs) */
  cost: number;
  count: number;
  gross: number;
};

/**
 * Build a month (MM-yyyy) → {cost, count, gross} lookup from the terminal
 * payload. The terminal rows are already zero-filled across the picked range,
 * so every month in range has an entry — a no-activity month joins to zeros,
 * not to a hole. The renderer looks up each analysis monthly month; a month
 * absent from the map (defensive — only if the two payloads disagree) reads as
 * a zero cost. `cost` uses withdrawalLossAmount so the sign matches the
 * Withdrawals tab (positive = a loss).
 */
export function joinMonthlyWithdrawalCost(terminal: TerminalPnlRow[]): Map<string, MonthlyWithdrawalCost> {
  const byMonth = new Map<string, MonthlyWithdrawalCost>();
  for (const r of terminal) {
    byMonth.set(r.month, {
      cost: withdrawalLossAmount(r),
      count: r.withdrawalCount,
      gross: r.withdrawalGross,
    });
  }
  return byMonth;
}

// ---- profit by travel day (separate endpoint, bucketed by 6h of day) ----

// canonical 6h bucket ladder — the column order in the profit grid is stable
// regardless of the order zinc returns buckets in
export const PROFIT_QUARTERS: readonly number[] = [0, 6, 12, 18] as const;

/** one 6h-cell of the profit grid */
export type ProfitCell = {
  quarterStartHour: number;
  /** completed bookings that touched this bucket on this travel date */
  tickets: number;
  revenue: number;
  cost: number;
  /** tickets in the bucket with a recorded actual KTMB cost; < tickets means
   * the cost number is partial and the UI must mark the cell */
  withActualCost: number;
};

/** one travel-date row of the profit grid (4 cells + day totals) */
export type ProfitDayRow = {
  /** zinc wire format, dd-MM-yyyy */
  date: string;
  /** quarter → cell; absent buckets read as zeros via cellProfit */
  cells: Record<number, ProfitCell>;
  tickets: number;
  revenue: number;
  cost: number;
  withActualCost: number;
};

/**
 * Pivot the flat profit-bucket payload into one ProfitDayRow per travel date
 * with every quarter zero-filled. Order: zinc's emission order (ascending
 * travel dates), preserved so the table reads from earliest travel date to
 * latest. Empty input → empty output.
 */
export function pivotProfitBuckets(rs: BookingAnalysisProfitBucketRes[]): ProfitDayRow[] {
  const order: string[] = [];
  const byDate = new Map<string, ProfitDayRow>();
  for (const r of rs) {
    let row = byDate.get(r.date);
    if (row == null) {
      row = { date: r.date, cells: {}, tickets: 0, revenue: 0, cost: 0, withActualCost: 0 };
      byDate.set(r.date, row);
      order.push(r.date);
    }
    // merge duplicate (date, quarter) rows defensively (same treatment as
    // groupByDay) — overwriting the cell while still adding to the day
    // totals would silently desync the grid cells from the Total column
    const existing = row.cells[r.quarterStartHour];
    if (existing == null) {
      row.cells[r.quarterStartHour] = {
        quarterStartHour: r.quarterStartHour,
        tickets: r.tickets,
        revenue: r.revenue,
        cost: r.cost,
        withActualCost: r.withActualCost,
      };
    } else {
      existing.tickets += r.tickets;
      existing.revenue += r.revenue;
      existing.cost += r.cost;
      existing.withActualCost += r.withActualCost;
    }
    row.tickets += r.tickets;
    row.revenue += r.revenue;
    row.cost += r.cost;
    row.withActualCost += r.withActualCost;
  }
  return order.map(d => byDate.get(d)!).filter(Boolean);
}

/** a single cell of the profit grid, zero-filled when zinc omitted the bucket */
export function cellProfit(row: ProfitDayRow, quarter: number): ProfitCell {
  return (
    row.cells[quarter] ?? {
      quarterStartHour: quarter,
      tickets: 0,
      revenue: 0,
      cost: 0,
      withActualCost: 0,
    }
  );
}

/** profit = revenue − cost (an absent bucket returns 0, not NaN) */
export function cellNet(c: ProfitCell): number {
  return c.revenue - c.cost;
}

/** the cell needs a "cost incomplete" marker when actual coverage is partial */
export function cellCostIncomplete(c: ProfitCell): boolean {
  return c.tickets > 0 && c.withActualCost < c.tickets;
}

/** grand total over a travel-date row */
export function dayProfitNet(row: ProfitDayRow): number {
  return row.revenue - row.cost;
}

// ---- boost ledger rows ----

export type BoostView = {
  /** the boost cost nothing (fee null or the free flag) */
  free: boolean;
  /** an admin boosted someone else's booking (grantedBy is stamped) */
  admin: boolean;
  /**
   * free self-boost — the user hit a free-target rule ("Free (targeted)");
   * admin-granted free boosts are NOT targeted, the admin badge explains
   * those instead
   */
  targeted: boolean;
};

export function boostView(b: Pick<BookingBoostRes, 'free' | 'fee' | 'grantedBy'>): BoostView {
  const free = b.free || b.fee == null;
  const admin = b.grantedBy != null && b.grantedBy !== '';
  return { free, admin, targeted: free && !admin };
}

// ---- URL-state parsing (pure slices of the /stats pattern) ----

export const ANALYSIS_TABS = ['overview', 'monthly', 'byday', 'profit', 'boosts', 'payments', 'withdrawals', 'costs'];

export function pickParam(v: string | null, allowed: string[]): string {
  return v != null && allowed.includes(v) ? v : '';
}

/**
 * `?boost=N` (1-indexed page) → the internal 0-based `Skip` offset.
 *
 * The URL carries a page NUMBER because that is what reads sensibly in a
 * shared link; the boosts endpoint wants an offset, so the conversion lives
 * here next to the other URL parsers. Page 1 (skip 0) is the default and is
 * omitted from the URL entirely.
 *
 * Anything that is not a whole number ≥ 1 — absent, blank, "abc", "0", "-3",
 * "2.5" — reads as page 1 rather than producing a negative or fractional
 * Skip that zinc would reject. An out-of-RANGE page cannot be rejected here
 * (the total is only known after a fetch); it comes back as an empty ledger
 * page, the same as it did before the URL was involved.
 */
export function boostSkipParam(raw: string | null | undefined, limit: number): number {
  if (!Number.isInteger(limit) || limit < 1) return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 0;
  return (n - 1) * limit;
}

/** dd-MM-yyyy from the URL, "" unless it round-trips through a real calendar day. */
export function urlDayParam(s: string | null): string {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s ?? '');
  if (m == null) return '';
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return '';
  // months are 0-based in Date; an impossible day-of-month rolls over and
  // fails the round-trip comparison
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day ? (s as string) : '';
}
