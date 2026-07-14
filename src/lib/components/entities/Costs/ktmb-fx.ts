// Pure validation/shaping helpers for the MYR→SGD FX rate admin card
// (mirrors zinc's SetKtmbFxReq: rate > 0, effectiveAt empty = immediate or a
// future instant). rate is SGD per 1 MYR. Kept pure and unit-testable so the
// dialog can translate error KEY SUFFIXES under `admin.costs.ktmbFx.*`.

export type KtmbFxDraft = {
  /** SGD per 1 MYR, as typed by the admin */
  rate: string;
  /** datetime-local string in the admin's local timezone; "" = immediate */
  effectiveAt: string;
};

export type KtmbFxDraftErrors = {
  rate?: string;
  effectiveAt?: string;
};

function atMostDecimals(x: number, max: number): boolean {
  const r = x.toString().split('.');
  return r.length !== 2 || r[1].length <= max;
}

/**
 * Validate the add-rate draft. Error values are i18n KEY SUFFIXES under
 * `admin.costs.ktmbFx.*` (the dialog translates them) so this stays pure and
 * unit-testable without a locale runtime. rate must be a finite number > 0
 * (SGD per 1 MYR) with at most 6 decimals; a bounded upper cap guards against
 * fat-finger entries.
 */
export function validateKtmbFxDraft(d: KtmbFxDraft, now: Date = new Date()): KtmbFxDraftErrors {
  const errors: KtmbFxDraftErrors = {};

  const rateStr = d.rate.trim();
  const rate = Number(rateStr);
  if (rateStr === '' || !Number.isFinite(rate) || rate <= 0 || rate > 1000 || !atMostDecimals(rate, 6)) {
    errors.rate = 'rateRange';
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
export function ktmbFxDraftToReq(d: KtmbFxDraft): { rate: number; effectiveAt: string | null } {
  return {
    rate: Number(d.rate.trim()),
    effectiveAt: d.effectiveAt === '' ? null : new Date(d.effectiveAt).toISOString(),
  };
}
