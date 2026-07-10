import type { DiscountRecordRes } from '$lib/api/core/data-contracts';

/** One rendered discount line: the amount BEFORE this discount (struck out in
 * the UI) and the amount AFTER it. */
interface DiscountStep {
  discount: DiscountRecordRes;
  before: number;
  after: number;
}

/**
 * Expands a summary's discounts into sequential before/after steps so the UI
 * can strike out the pre-discount amount next to each discounted result (the
 * strikeout is the DISCOUNT signature — policy lines never strike out).
 *
 * Steps replay zinc's order (Flat subtracts, Percentage multiplies, floored
 * at 0), but the LAST step always lands exactly on the server's `final` so
 * client-side rounding can never disagree with what is actually charged.
 */
export function discountSteps(
  subtotal: number,
  final: number,
  discounts: DiscountRecordRes[] | null | undefined,
): DiscountStep[] {
  const ds = discounts ?? [];
  const steps: DiscountStep[] = [];
  let running = subtotal;
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    const computed = d.type === 'Flat' ? running - d.amount : running * (1 - d.amount);
    const after = i === ds.length - 1 ? final : Math.max(0, computed);
    steps.push({ discount: d, before: running, after });
    running = after;
  }
  return steps;
}

export type { DiscountStep };
