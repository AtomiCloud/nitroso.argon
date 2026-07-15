// Pure helpers for the /pnl page — BunnyBooker's single money view.
//
// HEADLINE (terminal-event model, GET Booking/pnl/terminal): profit is
// recognized when money reaches a terminal state — a booking completes, a
// booking terminates, or a withdrawal pays out — and every deposited dollar
// carries its gateway-fee share to its terminal event via the month's
// blended gwRate (paymentFees ÷ deposits).
//
// CASH (GET Booking/analysis/pnl, re-homed from the retired /analysis P&L
// tab): deposits − net payouts − gateway fees, the "what's in our pockets
// today" reading that counts unspent wallet float as BunnyBooker cash.
//
// Everything here is client-side shaping of those payloads so the page
// component stays declarative (and the math stays unit-testable).
import type { BookingAnalysisPnlRowRes, BookingTerminalPnlRowRes } from '$lib/api/core/data-contracts';

/** zinc's monthly bucket wire format, "MM-yyyy" → a sortable yyyyMM key.
 *  Defensive: rejects months outside 01-12 (the wire format is MM-yyyy and
 *  "13-2026" is structurally valid for the regex but semantically wrong —
 *  a malformed URL or bad payload would otherwise produce a nonsense sort
 *  key and let the zero-fill cursor math loop forever). */
export function monthSortKey(month: string): string {
  const m = /^(\d{2})-(\d{4})$/.exec(month);
  if (m == null) return '';
  const mm = Number(m[1]);
  if (mm < 1 || mm > 12) return '';
  return `${m[2]}${m[1]}`;
}

/** Every SGT calendar month between from and to (inclusive), as MM-yyyy
 *  labels in ascending order. Empty when either bound is malformed or the
 *  bounds are inverted — callers fall back to a pass-through sort. */
function monthRange(from: string, to: string): string[] {
  const fromKey = monthSortKey(from);
  const toKey = monthSortKey(to);
  if (fromKey === '' || toKey === '' || fromKey > toKey) return [];
  // yyyyMM → MM-yyyy
  const label = (k: string) => `${k.slice(4, 6)}-${k.slice(0, 4)}`;
  const months: string[] = [];
  let cursor = fromKey;
  while (cursor <= toKey) {
    months.push(label(cursor));
    const y = Number(cursor.slice(0, 4));
    const m = Number(cursor.slice(4, 6));
    cursor = m === 12 ? `${y + 1}01` : `${y}${String(m + 1).padStart(2, '0')}`;
  }
  return months;
}

// ---- HEADLINE view (terminal-event model) ----

/**
 * One month of the terminal-event P&L, flattened out of zinc's nested wire
 * shape so the renderer and the profit formulas read straight off one row.
 */
export type TerminalPnlRow = {
  /** zinc wire format, MM-yyyy */
  month: string;
  deposits: number;
  paymentFees: number;
  /** the month's blended gateway-fee rate, paymentFees ÷ deposits (a fraction, e.g. 0.033) */
  gwRate: number;
  completedCount: number;
  collected: number;
  ktmbCost: number;
  terminatedCount: number;
  kept: number;
  ktmbCostNet: number;
  withExactRefund: number;
  withdrawalCount: number;
  withdrawalGross: number;
  feeIncome: number;
  payoutFees: number;
};

/** Shape zinc's nested terminal payload into the flat row the UI renders. */
export function toTerminalPnlRow(r: BookingTerminalPnlRowRes): TerminalPnlRow {
  return {
    month: r.month,
    deposits: r.deposits,
    paymentFees: r.paymentFees,
    gwRate: r.gwRate,
    completedCount: r.completed.count,
    collected: r.completed.collected,
    ktmbCost: r.completed.ktmbCost,
    terminatedCount: r.terminated.count,
    kept: r.terminated.kept,
    ktmbCostNet: r.terminated.ktmbCostNet,
    withExactRefund: r.terminated.withExactRefund,
    withdrawalCount: r.withdrawals.count,
    withdrawalGross: r.withdrawals.gross,
    feeIncome: r.withdrawals.feeIncome,
    payoutFees: r.withdrawals.payoutFees,
  };
}

function zeroTerminalPnlRow(month: string): TerminalPnlRow {
  return {
    month,
    deposits: 0,
    paymentFees: 0,
    gwRate: 0,
    completedCount: 0,
    collected: 0,
    ktmbCost: 0,
    terminatedCount: 0,
    kept: 0,
    ktmbCostNet: 0,
    withExactRefund: 0,
    withdrawalCount: 0,
    withdrawalGross: 0,
    feeIncome: 0,
    payoutFees: 0,
  };
}

/**
 * Profit recognized on COMPLETED bookings: what we collected, minus the KTMB
 * cost of delivering the tickets, minus the gateway-fee share the collected
 * dollars carried in (the month's blended rate over the collected amount).
 */
export function completedProfit(r: Pick<TerminalPnlRow, 'collected' | 'ktmbCost' | 'gwRate'>): number {
  return r.collected - r.ktmbCost - r.gwRate * r.collected;
}

/**
 * Profit recognized on TERMINATED bookings: what BunnyBooker kept, minus the
 * KTMB cost NOT recovered on termination (net), minus the gateway-fee share
 * the kept dollars carried in.
 */
export function terminatedProfit(r: Pick<TerminalPnlRow, 'kept' | 'ktmbCostNet' | 'gwRate'>): number {
  return r.kept - r.ktmbCostNet - r.gwRate * r.kept;
}

/**
 * Profit recognized on paid-out WITHDRAWALS: the withdrawal fee we kept,
 * minus the gateway-fee share the withdrawn dollars carried in (they left
 * as principal, taking their share of the month's payment fees with them),
 * minus the Airwallex payout fees.
 */
export function withdrawalProfit(
  r: Pick<TerminalPnlRow, 'feeIncome' | 'withdrawalGross' | 'gwRate' | 'payoutFees'>,
): number {
  return r.feeIncome - r.gwRate * r.withdrawalGross - r.payoutFees;
}

/** EBITDA for the month = the three terminal-event profit lines summed. */
export function ebitda(r: TerminalPnlRow): number {
  return completedProfit(r) + terminatedProfit(r) + withdrawalProfit(r);
}

/**
 * Terminated bookings whose KTMB recovery is ESTIMATED (zinc's 50% fallback
 * constant) rather than known exactly. > 0 means the month's terminated
 * profit is partly estimated and the UI marks it.
 */
export function estimatedRecoveryCount(r: Pick<TerminalPnlRow, 'terminatedCount' | 'withExactRefund'>): number {
  return Math.max(0, r.terminatedCount - r.withExactRefund);
}

/**
 * Zero-fill the terminal payload across every SGT calendar month between
 * from (inclusive) and to (inclusive). Missing months get an all-zeros row
 * so the table renders a continuous series instead of jumping between
 * activity months. zinc returns ascending by month; we preserve that
 * ordering. Malformed bounds fall back to a pass-through sort so the caller
 * still gets a usable table.
 */
export function terminalZeroFill(rows: BookingTerminalPnlRowRes[], from: string, to: string): TerminalPnlRow[] {
  const months = monthRange(from, to);
  if (months.length === 0) {
    return [...rows].map(toTerminalPnlRow).sort((a, b) => monthSortKey(a.month).localeCompare(monthSortKey(b.month)));
  }
  const byMonth = new Map(rows.map(r => [r.month, toTerminalPnlRow(r)] as const));
  return months.map(m => byMonth.get(m) ?? zeroTerminalPnlRow(m));
}

/**
 * The range totals row. Raw columns are plain sums; the profit lines are
 * the SUM of each month's profit — NOT the formulas re-run over the summed
 * columns, because each month carries its own blended gwRate and a
 * range-blended rate would recognize the wrong fee share. The totals
 * gwRate is the range-blended chip (summed paymentFees ÷ summed deposits),
 * shown for context only.
 */
export type TerminalPnlTotals = TerminalPnlRow & {
  completedProfit: number;
  terminatedProfit: number;
  withdrawalProfit: number;
  ebitda: number;
};

export function terminalTotals(rows: TerminalPnlRow[]): TerminalPnlTotals {
  const sum = rows.reduce(
    (s, r) => ({
      month: '',
      deposits: s.deposits + r.deposits,
      paymentFees: s.paymentFees + r.paymentFees,
      gwRate: 0,
      completedCount: s.completedCount + r.completedCount,
      collected: s.collected + r.collected,
      ktmbCost: s.ktmbCost + r.ktmbCost,
      terminatedCount: s.terminatedCount + r.terminatedCount,
      kept: s.kept + r.kept,
      ktmbCostNet: s.ktmbCostNet + r.ktmbCostNet,
      withExactRefund: s.withExactRefund + r.withExactRefund,
      withdrawalCount: s.withdrawalCount + r.withdrawalCount,
      withdrawalGross: s.withdrawalGross + r.withdrawalGross,
      feeIncome: s.feeIncome + r.feeIncome,
      payoutFees: s.payoutFees + r.payoutFees,
    }),
    zeroTerminalPnlRow(''),
  );
  return {
    ...sum,
    gwRate: sum.deposits === 0 ? 0 : sum.paymentFees / sum.deposits,
    completedProfit: rows.reduce((s, r) => s + completedProfit(r), 0),
    terminatedProfit: rows.reduce((s, r) => s + terminatedProfit(r), 0),
    withdrawalProfit: rows.reduce((s, r) => s + withdrawalProfit(r), 0),
    ebitda: rows.reduce((s, r) => s + ebitda(r), 0),
  };
}

// ---- CASH view (re-homed from the retired /analysis P&L tab) ----

export type PnlMonthRow = {
  /** zinc wire format, MM-yyyy */
  month: string;
  deposits: number;
  withdrawalCount: number;
  withdrawalTotal: number;
  withdrawalFeeIncome: number;
  gatewayFees: number;
  ticketRevenue: number;
  ktmbCost: number;
};

/**
 * CASH view net = deposits − (withdrawalTotal − withdrawalFeeIncome) − gatewayFees.
 * Captures movement of money through BunnyBooker: in (deposits), out
 * (withdrawals), and the channel cost of moving it (gateway fees).
 * withdrawalTotal is GROSS (the wallet debit) but only Amount − Fee actually
 * leaves the bank — the fee stays with BunnyBooker — so cash out is the net
 * payout. Wallet float that hasn't been withdrawn still sits inside deposits,
 * so this view counts unspent float as BunnyBooker cash — the "what's in our
 * pockets today" reading.
 */
export function pnlCashNet(r: PnlMonthRow): number {
  return r.deposits - (r.withdrawalTotal - r.withdrawalFeeIncome) - r.gatewayFees;
}

/**
 * Zero-fill the cash P&L payload across every SGT calendar month between
 * from (inclusive) and to (inclusive). Missing months get an all-zeros row
 * so the table renders a continuous series instead of jumping between
 * activity months. zinc returns ascending by month; we preserve that
 * ordering. Malformed bounds fall back to a pass-through sort so the caller
 * still gets a usable table.
 */
export function pnlZeroFill(rows: BookingAnalysisPnlRowRes[], from: string, to: string): PnlMonthRow[] {
  const months = monthRange(from, to);
  if (months.length === 0) {
    return [...rows].map(toPnlMonthRow).sort((a, b) => monthSortKey(a.month).localeCompare(monthSortKey(b.month)));
  }
  const byMonth = new Map(rows.map(r => [r.month, toPnlMonthRow(r)] as const));
  return months.map(m => byMonth.get(m) ?? zeroPnlMonthRow(m));
}

function toPnlMonthRow(r: BookingAnalysisPnlRowRes): PnlMonthRow {
  return {
    month: r.month,
    deposits: r.deposits,
    withdrawalCount: r.withdrawalCount,
    withdrawalTotal: r.withdrawalTotal,
    withdrawalFeeIncome: r.withdrawalFeeIncome,
    gatewayFees: r.gatewayFees,
    ticketRevenue: r.ticketRevenue,
    ktmbCost: r.ktmbCost,
  };
}

function zeroPnlMonthRow(month: string): PnlMonthRow {
  return {
    month,
    deposits: 0,
    withdrawalCount: 0,
    withdrawalTotal: 0,
    withdrawalFeeIncome: 0,
    gatewayFees: 0,
    ticketRevenue: 0,
    ktmbCost: 0,
  };
}

/** Sum every cash column across rows — the totals row at the bottom of the table. */
export function pnlTotals(rows: PnlMonthRow[]): PnlMonthRow {
  return rows.reduce<PnlMonthRow>(
    (s, r) => ({
      month: '',
      deposits: s.deposits + r.deposits,
      withdrawalCount: s.withdrawalCount + r.withdrawalCount,
      withdrawalTotal: s.withdrawalTotal + r.withdrawalTotal,
      withdrawalFeeIncome: s.withdrawalFeeIncome + r.withdrawalFeeIncome,
      gatewayFees: s.gatewayFees + r.gatewayFees,
      ticketRevenue: s.ticketRevenue + r.ticketRevenue,
      ktmbCost: s.ktmbCost + r.ktmbCost,
    }),
    zeroPnlMonthRow(''),
  );
}

// ---- URL-state parsing (pure slices of the /stats pattern) ----

export const PNL_TABS = ['earned', 'cash'];

export function pickParam(v: string | null, allowed: string[]): string {
  return v != null && allowed.includes(v) ? v : '';
}
