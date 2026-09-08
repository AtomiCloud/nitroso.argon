// Pure helpers for the /pnl page — BunnyBooker's single money view.
//
// The shared terminal-event pieces (TerminalPnlRow, completedProfit /
// terminatedProfit / withdrawalProfit / ebitda, the withdrawal breakdown,
// withdrawal loss + blended loss %, terminalZeroFill, terminalTotals) live
// in src/lib/pnl/terminal.ts so /analysis can import them for its
// Withdrawals tab without duplicating math.
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
import type { BookingAnalysisPnlRowRes } from '$lib/api/core/data-contracts';

// Re-export the shared terminal-event helpers so existing /pnl imports
// (`from './pnl'`) keep working without churn.
export {
  monthSortKey,
  type TerminalPnlRow,
  type TerminalPnlTotals,
  type WithdrawalBreakdown,
  type WithdrawalTotals,
  toTerminalPnlRow,
  completedProfit,
  terminatedProfit,
  withdrawalProfit,
  ebitda,
  pnlWithdrawalBreakdown,
  withdrawalLossAmount,
  blendedLossPct,
  withdrawalTotals,
  terminalZeroFill,
  terminalTotals,
} from '$lib/pnl/terminal';

import type { TerminalPnlRow } from '$lib/pnl/terminal';
import { ebitda as ebitdaCore } from '$lib/pnl/terminal';

/**
 * Terminated bookings whose KTMB recovery is ESTIMATED (zinc's 50% fallback
 * constant) rather than known exactly. > 0 means the month's terminated
 * profit is partly estimated and the UI marks it.
 */
export function estimatedRecoveryCount(r: Pick<TerminalPnlRow, 'terminatedCount' | 'withExactRefund'>): number {
  return Math.max(0, r.terminatedCount - r.withExactRefund);
}

/**
 * Completed bookings with NO captured actual KTMB cost. These contribute
 * ZERO to ktmbCost — zinc does not estimate them — so a month with any
 * uncosted booking has an understated cost and an OVERSTATED profit.
 *
 * This is a harder warning than estimatedRecoveryCount: that one flags a
 * figure computed from a 50% fallback, this one flags a figure computed
 * from nothing at all. Sept 2026: August reported ~SGD 0.0009 of cost per
 * ticket against a true fare of SGD 1.60-5.60, which would have overpaid
 * each profit-share partner by about SGD 5,460.
 */
export function uncostedCompletedCount(r: Pick<TerminalPnlRow, 'completedCount' | 'withActual'>): number {
  return Math.max(0, r.completedCount - r.withActual);
}

/** Fraction of completed bookings carrying a real KTMB cost, 0..1. */
export function costCoverage(r: Pick<TerminalPnlRow, 'completedCount' | 'withActual'>): number {
  if (r.completedCount <= 0) return 1;
  return Math.min(1, Math.max(0, r.withActual / r.completedCount));
}

/**
 * Flat monthly infrastructure cost (SGD) subtracted from EBITDA to reach
 * the bottom-line Net. Manually-set estimate — when the real monthly infra
 * spend changes, bump this constant and re-deploy. Always burns, even in
 * months with zero activity (the totals row subtracts it per month in the
 * displayed range).
 */
export const INFRA_COST_MONTHLY = 500;

/** Gross revenue: the money we recognized on terminal events this month,
 *  the denominator of profitPct. Sum of collected on completed bookings,
 *  the amount we kept on terminated bookings, and the fee share we kept
 *  on withdrawals — the three sources of recognized revenue. */
export function grossRevenue(r: Pick<TerminalPnlRow, 'collected' | 'kept' | 'feeIncome'>): number {
  return r.collected + r.kept + r.feeIncome;
}

/** Bottom-line Net = EBITDA − INFRA_COST_MONTHLY. Infra burns every month
 *  regardless of activity, so the per-month row never gets to skip it. */
export function netAfterInfra(r: TerminalPnlRow): number {
  return ebitdaCore(r) - INFRA_COST_MONTHLY;
}

/** Bottom-line Net on the range totals row: sum of monthly EBITDAs minus
 *  infra × the number of months displayed in the picked range (including
 *  zero-activity months — infra burns even when nothing else does). */
export function netAfterInfraTotals(rows: TerminalPnlRow[]): number {
  return rows.reduce((s, r) => s + ebitdaCore(r), 0) - INFRA_COST_MONTHLY * rows.length;
}

/** Profit margin as a fraction (e.g. 0.15 = 15%). null when there was no
 *  recognized revenue to divide against — the UI renders an em-dash rather
 *  than "NaN%". */
export function profitPct(
  r: Pick<TerminalPnlRow, 'collected' | 'kept' | 'feeIncome'> & { ebitda: number },
): number | null {
  const rev = grossRevenue(r);
  if (rev === 0) return null;
  return (r.ebitda - INFRA_COST_MONTHLY) / rev;
}

/** Profit margin on the range totals row: (Σ EBITDA − infra × months) ÷ Σ revenue. */
export function profitPctTotals(rows: TerminalPnlRow[]): number | null {
  const totalEbitda = rows.reduce((s, r) => s + ebitdaCore(r), 0);
  const totalRevenue = rows.reduce((s, r) => s + grossRevenue(r), 0);
  if (totalRevenue === 0) return null;
  return (totalEbitda - INFRA_COST_MONTHLY * rows.length) / totalRevenue;
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

import { monthSortKey, monthRange } from '$lib/pnl/terminal';

export const PNL_TABS = ['earned', 'cash'];

export function pickParam(v: string | null, allowed: string[]): string {
  return v != null && allowed.includes(v) ? v : '';
}
