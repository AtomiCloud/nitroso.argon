// Pure helpers for the /partners page. The page estimates the 50/50 settlement
// with reseller (partner-tagged) accounts by month. zinc returns one row per
// active month for a picked user; everything here is client-side shaping of
// that payload so the page component stays declarative (and the math stays
// unit-testable). Mirrors the pattern in analysis/analysis.ts — see
// pnlZeroFill, pnlCashNet, pnlEarnedNet for the shared monthly-rollup math.
//
// Settlement and list-value comparisons are CLIENT-side only; zinc returns the
// raw consumption and payment inputs. We compute the decision-ready values
// once per row so the renderer can stay declarative.
import type { UserPartnerPnlRowRes } from '$lib/api/core/data-contracts';

/** Mirrors the standard SGD ticket price; revisit if pricing changes. */
export const LIST_TICKET_PRICE = 10;

/** Public BunnyBooker list price for one priority boost, in SGD. */
export const LIST_BOOST_PRICE = 10;

type PartnerSettlementInput = Pick<
  UserPartnerPnlRowRes,
  'bookings' | 'collected' | 'boostCount' | 'boostAmount' | 'ktmbCost'
>;

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
 * A single partner's P&L row, in the shape the UI wants. Settlement values are
 * derived client-side from ticket/boost payments, list prices, and KTMB cost;
 * zinc returns the raw inputs only. boostCount / boostAmount /
 * distinctPassengers are additive (zinc PR #57): every consumed boost (FREE
 * included), what the partner paid, and the month's distinct passenger
 * passports. Together they expose the consumption and reseller signals the
 * owner needs for pricing and settlement.
 */
export type PartnerPnlRow = {
  /** zinc wire format, MM-yyyy */
  month: string;
  bookings: number;
  /** collected / bookings; 0 when there are no completed tickets */
  averageTicketPaid: number;
  /** ticket list value minus what the partner paid for tickets; never clamped */
  ticketMarginAtList: number;
  /** completed bookings that consumed a priority boost (FREE included) */
  boostCount: number;
  /** what the partner actually paid for those boosts */
  boostAmount: number;
  /** boostCount × LIST_BOOST_PRICE */
  boostListValue: number;
  /** boostListValue − boostAmount; positive is an arbitrage signal */
  boostListGap: number;
  /** distinct non-empty passenger passports in the month's completed tickets */
  distinctPassengers: number;
  /** ticket booking-request transactions only; boosts are in boostAmount */
  collected: number;
  /** collected + boostAmount */
  paidTotal: number;
  ktmbCost: number;
  /** bookings × LIST_TICKET_PRICE + boostCount × LIST_BOOST_PRICE */
  streetValue: number;
  /** paidTotal − ktmbCost */
  weEarned: number;
  /** streetValue − paidTotal */
  theyProfitEst: number;
  /** max(0, (theyProfitEst − weEarned) / 2) */
  topUpOwed: number;
  deposits: number;
  withdrawalGross: number;
  withdrawalFeeIncome: number;
};

/** Average negotiated ticket price actually paid; guards divide-by-zero. */
export function partnerAverageTicketPaid(bookings: number, collected: number): number {
  if (bookings === 0) return 0;
  return collected / bookings;
}

/** Maximum ticket profit at standard list price; negative means they paid above list. */
export function partnerTicketMarginAtList(bookings: number, collected: number): number {
  return (LIST_TICKET_PRICE - partnerAverageTicketPaid(bookings, collected)) * bookings;
}

/** Public list value of the boosts consumed in a row. */
export function partnerBoostListValue(boostCount: number): number {
  return boostCount * LIST_BOOST_PRICE;
}

/** How much higher list value is than what the partner actually paid. */
export function partnerBoostListGap(boostCount: number, boostAmount: number): number {
  return partnerBoostListValue(boostCount) - boostAmount;
}

/** Ticket booking payments plus separately reported boost payments. */
export function partnerPaidTotal(r: Pick<UserPartnerPnlRowRes, 'collected' | 'boostAmount'>): number {
  return r.collected + r.boostAmount;
}

/** Estimated resale proceeds when every ticket and boost sells at standard list. */
export function partnerStreetValue(r: Pick<UserPartnerPnlRowRes, 'bookings' | 'boostCount'>): number {
  return r.bookings * LIST_TICKET_PRICE + r.boostCount * LIST_BOOST_PRICE;
}

/** What BunnyBooker earned before non-KTMB costs. */
export function partnerWeEarned(r: Pick<UserPartnerPnlRowRes, 'collected' | 'boostAmount' | 'ktmbCost'>): number {
  return partnerPaidTotal(r) - r.ktmbCost;
}

/** Partner profit estimated from standard list resale proceeds. */
export function partnerTheyProfitEst(r: PartnerSettlementInput): number {
  return partnerStreetValue(r) - partnerPaidTotal(r);
}

/** Amount needed to equalize estimated profit 50/50; never shows a negative receivable. */
export function partnerTopUpOwed(r: PartnerSettlementInput): number {
  return Math.max(0, (partnerTheyProfitEst(r) - partnerWeEarned(r)) / 2);
}

/** Shape zinc's monthly payload into the row the UI renders. */
export function toPartnerPnlRow(r: UserPartnerPnlRowRes): PartnerPnlRow {
  return {
    month: r.month,
    bookings: r.bookings,
    averageTicketPaid: partnerAverageTicketPaid(r.bookings, r.collected),
    ticketMarginAtList: partnerTicketMarginAtList(r.bookings, r.collected),
    boostCount: r.boostCount,
    boostAmount: r.boostAmount,
    boostListValue: partnerBoostListValue(r.boostCount),
    boostListGap: partnerBoostListGap(r.boostCount, r.boostAmount),
    distinctPassengers: r.distinctPassengers ?? 0,
    collected: r.collected,
    paidTotal: partnerPaidTotal(r),
    ktmbCost: r.ktmbCost,
    streetValue: partnerStreetValue(r),
    weEarned: partnerWeEarned(r),
    theyProfitEst: partnerTheyProfitEst(r),
    topUpOwed: partnerTopUpOwed(r),
    deposits: r.deposits,
    withdrawalGross: r.withdrawalGross,
    withdrawalFeeIncome: r.withdrawalFeeIncome,
  };
}

function zeroPartnerPnlRow(month: string): PartnerPnlRow {
  return {
    month,
    bookings: 0,
    averageTicketPaid: 0,
    ticketMarginAtList: 0,
    boostCount: 0,
    boostAmount: 0,
    boostListValue: 0,
    boostListGap: 0,
    distinctPassengers: 0,
    collected: 0,
    paidTotal: 0,
    ktmbCost: 0,
    streetValue: 0,
    weEarned: 0,
    theyProfitEst: 0,
    topUpOwed: 0,
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

/** Aggregate raw inputs and re-derive the decision values for the totals row. */
export function partnerPnlTotals(rows: PartnerPnlRow[]): PartnerPnlRow {
  return rows.reduce<PartnerPnlRow>((s, r) => {
    const bookings = s.bookings + r.bookings;
    const boostCount = s.boostCount + r.boostCount;
    const boostAmount = s.boostAmount + r.boostAmount;
    const collected = s.collected + r.collected;
    const ktmbCost = s.ktmbCost + r.ktmbCost;
    const settlementInput: PartnerSettlementInput = { bookings, collected, boostCount, boostAmount, ktmbCost };
    return {
      month: '',
      bookings,
      averageTicketPaid: partnerAverageTicketPaid(bookings, collected),
      ticketMarginAtList: partnerTicketMarginAtList(bookings, collected),
      boostCount,
      boostAmount,
      boostListValue: partnerBoostListValue(boostCount),
      boostListGap: partnerBoostListGap(boostCount, boostAmount),
      distinctPassengers: s.distinctPassengers + r.distinctPassengers,
      collected,
      paidTotal: partnerPaidTotal(settlementInput),
      ktmbCost,
      streetValue: partnerStreetValue(settlementInput),
      weEarned: partnerWeEarned(settlementInput),
      theyProfitEst: partnerTheyProfitEst(settlementInput),
      // Re-derive the range settlement from aggregate profit, rather than
      // summing monthly top-up floors. A month where we are ahead must offset
      // a month where they are ahead before the picked range is split 50/50.
      topUpOwed: partnerTopUpOwed(settlementInput),
      deposits: s.deposits + r.deposits,
      withdrawalGross: s.withdrawalGross + r.withdrawalGross,
      withdrawalFeeIncome: s.withdrawalFeeIncome + r.withdrawalFeeIncome,
    };
  }, zeroPartnerPnlRow(''));
}

/** URL param mirror for the date range: dd-MM-yyyy from the URL → DateValue. */
export function urlMonthBound(s: string | null): string {
  // accept "MM-yyyy" as-is (what the range picker produces); reject
  // anything else so a malformed URL falls back to the default
  return monthSortKey(s ?? '') === '' ? '' : (s as string);
}
