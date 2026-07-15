// Pure helpers for the /partners page. The page tracks BunnyBooker's margin
// on reseller (partner-tagged) accounts by month. zinc returns one row per
// active month for a picked user; everything here is client-side shaping of
// that payload so the page component stays declarative (and the math stays
// unit-testable). Mirrors the pattern in analysis/analysis.ts — see
// pnlZeroFill, pnlCashNet, pnlEarnedNet for the shared monthly-rollup math.
//
// margin here is CLIENT-side only (collected − ktmbCost), zinc returns the
// raw inputs. We compute it once per row so the renderer can read straight
// off the helper.
import type { UserPartnerPnlRowRes } from '$lib/api/core/data-contracts';

/** zinc's monthly bucket wire format, "MM-yyyy" → a sortable yyyyMM key.
 *  Defensive: rejects months outside 01-12 (the wire format is MM-yyyy and
 *  "13-2026" is structurally valid for the regex but semantically wrong —
 *  a malformed URL or bad payload would otherwise produce a nonsense sort
 *  key and let partnerPnlZeroFill's cursor math loop forever). */
export function monthSortKey(month: string): string {
  const m = /^(\d{2})-(\d{4})$/.exec(month);
  if (m == null) return '';
  const mm = Number(m[1]);
  if (mm < 1 || mm > 12) return '';
  return `${m[2]}${m[1]}`;
}

/**
 * A single partner's P&L row, in the shape the UI wants. Margin is derived
 * client-side from collected − ktmbCost (per task spec); zinc returns the
 * raw inputs only. boostCount / boostAmount are additive (zinc PR #54) —
 * completed bookings that consumed a priority boost, plus the sum of their
 * boost fees. lets the admin see both successful tickets and successful
 * boosts so we can price the partner against both.
 */
export type PartnerPnlRow = {
  /** zinc wire format, MM-yyyy */
  month: string;
  bookings: number;
  /** completed bookings that consumed a priority boost (zinc PR #54) */
  boostCount: number;
  /** sum of boost fees on those bookings (zinc PR #54) */
  boostAmount: number;
  collected: number;
  ktmbCost: number;
  /** collected − ktmbCost; positive = partner made BunnyBooker money */
  margin: number;
  /** (collected − ktmbCost) / collected; 0 when collected is 0 */
  marginPct: number;
  deposits: number;
  withdrawalGross: number;
  withdrawalFeeIncome: number;
};

/**
 * BunnyBooker's margin on a partner for one month = collected − ktmbCost.
 * A positive number means the partner's activity earned us money net of
 * what KTMB charged us for the underlying tickets. A negative number means
 * KTMB's ticket costs exceeded what the partner brought in (rare in
 * practice — partners typically resell at or above our prices).
 */
export function partnerMargin(r: Pick<UserPartnerPnlRowRes, 'collected' | 'ktmbCost'>): number {
  return r.collected - r.ktmbCost;
}

/**
 * Margin as a fraction of collected revenue. Returns 0 when collected is 0
 * (no business, no margin percentage — guarding against divide-by-zero).
 * The UI renders this as a percentage.
 */
export function partnerMarginPct(r: Pick<UserPartnerPnlRowRes, 'collected' | 'ktmbCost'>): number {
  if (r.collected === 0) return 0;
  return partnerMargin(r) / r.collected;
}

/** Shape zinc's monthly payload into the row the UI renders. */
export function toPartnerPnlRow(r: UserPartnerPnlRowRes): PartnerPnlRow {
  return {
    month: r.month,
    bookings: r.bookings,
    boostCount: r.boostCount,
    boostAmount: r.boostAmount,
    collected: r.collected,
    ktmbCost: r.ktmbCost,
    margin: partnerMargin(r),
    marginPct: partnerMarginPct(r),
    deposits: r.deposits,
    withdrawalGross: r.withdrawalGross,
    withdrawalFeeIncome: r.withdrawalFeeIncome,
  };
}

function zeroPartnerPnlRow(month: string): PartnerPnlRow {
  return {
    month,
    bookings: 0,
    boostCount: 0,
    boostAmount: 0,
    collected: 0,
    ktmbCost: 0,
    margin: 0,
    marginPct: 0,
    deposits: 0,
    withdrawalGross: 0,
    withdrawalFeeIncome: 0,
  };
}

/**
 * Zero-fill the partner P&L payload across every SGT calendar month between
 * from (inclusive) and to (inclusive). Missing months get an all-zeros row
 * so the table renders a continuous series instead of jumping between
 * activity months. zinc returns ascending by month; we preserve that
 * ordering. Malformed bounds fall back to a pass-through sort so the caller
 * still gets a usable table.
 */
export function partnerPnlZeroFill(rows: UserPartnerPnlRowRes[], from: string, to: string): PartnerPnlRow[] {
  const fromKey = monthSortKey(from);
  const toKey = monthSortKey(to);
  if (fromKey === '' || toKey === '' || fromKey > toKey) {
    // sort by the numeric yyyyMM key (NOT localeCompare on the "MM-yyyy"
    // string — that gets year boundaries wrong: "12-2025".localeCompare
    // ("01-2026") < 0 is true by accident here, but "11-2025" < "02-2026"
    // is luckier than it looks and breaks with shorter prefixes)
    return [...rows].map(toPartnerPnlRow).sort((a, b) => monthSortKey(a.month).localeCompare(monthSortKey(b.month)));
  }
  // yyyyMM → MM-yyyy
  const label = (k: string) => `${k.slice(4, 6)}-${k.slice(0, 4)}`;
  const months: string[] = [];
  let cursor = fromKey;
  while (cursor <= toKey) {
    months.push(label(cursor));
    const y = Number(cursor.slice(0, 4));
    const m = Number(cursor.slice(4, 6));
    const next = m === 12 ? `${y + 1}01` : `${y}${String(m + 1).padStart(2, '0')}`;
    cursor = next;
  }
  const byMonth = new Map(rows.map(r => [r.month, toPartnerPnlRow(r)] as const));
  return months.map(m => byMonth.get(m) ?? zeroPartnerPnlRow(m));
}

/** Sum every column across the rows — the totals row at the bottom. */
export function partnerPnlTotals(rows: PartnerPnlRow[]): PartnerPnlRow {
  return rows.reduce<PartnerPnlRow>(
    (s, r) => ({
      month: '',
      bookings: s.bookings + r.bookings,
      boostCount: s.boostCount + r.boostCount,
      boostAmount: s.boostAmount + r.boostAmount,
      collected: s.collected + r.collected,
      ktmbCost: s.ktmbCost + r.ktmbCost,
      margin: s.margin + r.margin,
      // weighted average margin % over the summed collected, not the average
      // of monthly percentages — a slow month and a busy month with the same
      // % should produce one number, not be muddled by row counts
      marginPct: s.collected + r.collected === 0 ? 0 : (s.margin + r.margin) / (s.collected + r.collected),
      deposits: s.deposits + r.deposits,
      withdrawalGross: s.withdrawalGross + r.withdrawalGross,
      withdrawalFeeIncome: s.withdrawalFeeIncome + r.withdrawalFeeIncome,
    }),
    zeroPartnerPnlRow(''),
  );
}

/** URL param mirror for the date range: dd-MM-yyyy from the URL → DateValue. */
export function urlMonthBound(s: string | null): string {
  // accept "MM-yyyy" as-is (what the range picker produces); reject
  // anything else so a malformed URL falls back to the default
  return monthSortKey(s ?? '') === '' ? '' : (s as string);
}
