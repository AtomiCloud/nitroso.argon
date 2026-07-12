// Pure helpers for the /analysis page. Zinc returns one row per (SGT
// completion date, direction, departure time) plus a range summary, a
// monthly P&L rollup, a component ranking and the boost ledger; everything
// here is client-side shaping of those payloads so the page component stays
// declarative (and the math stays unit-testable).
import type {
  BookingAnalysisRowRes,
  BookingAnalysisSummaryRes,
  BookingBoostRes,
  MonthlyAnalysisRes,
} from '$lib/api/core/data-contracts';

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

export const ANALYSIS_TABS = ['overview', 'monthly', 'byday', 'boosts', 'payments'];

export function pickParam(v: string | null, allowed: string[]): string {
  return v != null && allowed.includes(v) ? v : '';
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
