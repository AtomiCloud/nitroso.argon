// Shared helpers for the terminal-event P&L view, used by both /pnl and
// /analysis. The terminal endpoint (GET Booking/pnl/terminal) recognizes
// profit when money reaches a terminal state — a booking completes, a
// booking terminates, or a withdrawal pays out — and every deposited dollar
// carries its gateway-fee share to its terminal event at the month's
// blended rate (paymentFees ÷ deposits).
//
// /pnl renders the earned (EBITDA) view that composes the three terminal
// profit lines; /analysis renders the withdrawal-only view that the admin
// uses to see why withdrawals are a structural loss. Both share the
// monthly flattening, the withdrawal breakdown, and the loss-vs-gross
// denominator, so they import from this module instead of duplicating the
// pure pieces.
import type { BookingTerminalPnlRowRes } from '$lib/api/core/data-contracts';

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
export function monthRange(from: string, to: string): string[] {
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
  /** completed bookings carrying a captured actual KTMB cost; the rest contribute 0 to ktmbCost */
  withActual: number;
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
    withActual: r.completed.withActual,
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
    withActual: 0,
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
 * The three signed components of withdrawalProfit — what makes the
 * withdrawal line "self-explanatory" on the Earned (EBITDA) tab. The cell
 * normally shows a single net number; this breakdown lets the renderer
 * surface "+ fee income kept", "− deposit fee materialized", and
 * "− payout fees" alongside it, so the reader sees how the ~4% fee income
 * is mostly absorbed by the gateway share carried in by the principal.
 *
 * Components are returned in display order (positive first, negatives
 * after). Sum equals withdrawalProfit(r) exactly; the renderer never
 * re-runs the formula.
 */
export type WithdrawalBreakdown = {
  /** BunnyBooker's 4% fee share kept on the withdrawal (positive) */
  feeIncome: number;
  /** Gateway-fee share the withdrawn principal carried in (shown negative) */
  depositFee: number;
  /** Airwallex per-payout fees (shown negative) */
  payoutFees: number;
};

export function pnlWithdrawalBreakdown(
  r: Pick<TerminalPnlRow, 'feeIncome' | 'withdrawalGross' | 'gwRate' | 'payoutFees'>,
): WithdrawalBreakdown {
  return {
    feeIncome: r.feeIncome,
    depositFee: r.gwRate * r.withdrawalGross,
    payoutFees: r.payoutFees,
  };
}

/**
 * Net loss amount on withdrawals (positive = a loss, negative = a gain).
 * Mirrors the sign of the breakdown on /analysis's Withdrawals tab where
 * the column is colored red when BunnyBooker lost money on payouts that
 * month and green when the fee income exceeded the channel costs.
 */
export function withdrawalLossAmount(
  r: Pick<TerminalPnlRow, 'feeIncome' | 'withdrawalGross' | 'gwRate' | 'payoutFees'>,
): number {
  return r.gwRate * r.withdrawalGross + r.payoutFees - r.feeIncome;
}

/**
 * Blended loss per withdrawal dollar as a fraction (e.g. 0.05 = 5% of every
 * paid-out dollar is lost to channel costs). null when no gross was paid
 * out that month — the UI renders an em-dash rather than "NaN%".
 */
export function blendedLossPct(
  r: Pick<TerminalPnlRow, 'feeIncome' | 'withdrawalGross' | 'gwRate' | 'payoutFees'>,
): number | null {
  if (r.withdrawalGross === 0) return null;
  return withdrawalLossAmount(r) / r.withdrawalGross;
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
 * Withdrawals tab totals — sums the raw withdrawal columns across the
 * months in the picked range and re-derives netLoss + blendedLossPct on
 * the totals (each month keeps its own gwRate, so we cannot simply sum
 * monthly blendedLossPct values; we divide by the summed gross).
 */
export type WithdrawalTotals = {
  count: number;
  gross: number;
  feeIncome: number;
  depositFee: number;
  payoutFees: number;
  netLoss: number;
  blendedLossPct: number | null;
};

export function withdrawalTotals(rows: TerminalPnlRow[]): WithdrawalTotals {
  let count = 0;
  let gross = 0;
  let feeIncome = 0;
  let depositFee = 0;
  let payoutFees = 0;
  for (const r of rows) {
    count += r.withdrawalCount;
    gross += r.withdrawalGross;
    feeIncome += r.feeIncome;
    depositFee += r.gwRate * r.withdrawalGross;
    payoutFees += r.payoutFees;
  }
  const netLoss = depositFee + payoutFees - feeIncome;
  return {
    count,
    gross,
    feeIncome,
    depositFee,
    payoutFees,
    netLoss,
    blendedLossPct: gross === 0 ? null : netLoss / gross,
  };
}

/**
 * The /pnl earned view's range totals row — extends TerminalPnlRow with the
 * computed profit fields. Raw columns are plain sums; the profit lines are
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
      withActual: s.withActual + r.withActual,
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
