/**
 * Rounds to cents with half-to-even (banker's) rounding, matching zinc's
 * FeeCalculator (`Math.Round(..., 2, MidpointRounding.ToEven)`) exactly, so a
 * fee shown here can never differ from the fee the ledger books — e.g. rate
 * 2.5% on $1.00 is $0.02 on both sides, where half-up rounding would show
 * $0.03 and overpay the user by a cent on manual completion.
 */
export function roundToEvenCents(x: number): number {
  const cents = x * 100;
  const floor = Math.floor(cents);
  const diff = cents - floor;
  const epsilon = 1e-9;
  if (diff > 0.5 + epsilon) return (floor + 1) / 100;
  if (diff < 0.5 - epsilon) return floor / 100;
  return (floor % 2 === 0 ? floor : floor + 1) / 100;
}
