// Pure validation/shaping helpers for the KTMB ticket-cost admin card
// (mirrors zinc's SetKtmbCostReqValidator: direction required, cost
// greater than 0 and up to 10,000 with ≤ 2 decimals, effectiveAt empty =
// immediate or a future instant). 0 is rejected on purpose — a free KTMB
// ticket would be inconsistent with the recorded-actual-cost model the
// sales analysis assumes.
import type { KtmbCostRes } from '$lib/api/core/data-contracts';

export type KtmbDraft = {
  direction: string;
  cost: string;
  /** datetime-local string in the admin's local timezone; "" = immediate */
  effectiveAt: string;
};

export type KtmbDraftErrors = {
  direction?: string;
  cost?: string;
  effectiveAt?: string;
};

function twoDecimals(x: number): boolean {
  const r = x.toString().split('.');
  return r.length !== 2 || r[1].length <= 2;
}

/**
 * Validate the add-change draft. Error values are i18n KEY SUFFIXES under
 * `admin.costs.ktmb.*` (the dialog translates them) so this stays pure and
 * unit-testable without a locale runtime.
 */
export function validateKtmbDraft(d: KtmbDraft, now: Date = new Date()): KtmbDraftErrors {
  const errors: KtmbDraftErrors = {};
  if (d.direction !== 'JToW' && d.direction !== 'WToJ') errors.direction = 'directionRequired';

  const costStr = d.cost.trim();
  const cost = Number(costStr);
  if (costStr === '' || !Number.isFinite(cost) || cost <= 0 || cost > 10_000 || !twoDecimals(cost)) {
    errors.cost = 'costRange';
  }

  if (d.effectiveAt !== '') {
    const t = new Date(d.effectiveAt).getTime();
    if (Number.isNaN(t)) errors.effectiveAt = 'effectiveInvalid';
    else if (t <= now.getTime()) errors.effectiveAt = 'effectivePast';
  }
  return errors;
}

/**
 * Draft → POST body. datetime-local is timezone-less; Date() reads it in the
 * admin's local zone and toISOString() converts to the UTC instant zinc
 * expects. Call only on a draft that validated clean.
 */
export function ktmbDraftToReq(d: KtmbDraft): { direction: string; cost: number; effectiveAt: string | null } {
  return {
    direction: d.direction,
    cost: Number(d.cost.trim()),
    effectiveAt: d.effectiveAt === '' ? null : new Date(d.effectiveAt).toISOString(),
  };
}

export type KtmbCurrentRow = {
  direction: string;
  /** null = never configured (zinc omits the key; costing counts it as 0) */
  cost: number | null;
};

/**
 * The current-cost card always shows BOTH directions in canonical order —
 * a missing key renders as "not configured" instead of silently vanishing.
 */
export function currentRows(res: Pick<KtmbCostRes, 'current'>, directions: string[]): KtmbCurrentRow[] {
  return directions.map(direction => ({
    direction,
    cost: Object.prototype.hasOwnProperty.call(res.current, direction) ? res.current[direction] : null,
  }));
}
