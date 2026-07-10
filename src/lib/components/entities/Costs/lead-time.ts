/** Convert the cost-policy select value into Zinc's numeric request field. */
export function leadTimeSelectionToRequest(enabled: boolean, selectedValue?: string): number | null {
  if (!enabled || selectedValue == null || !/^\d+$/.test(selectedValue)) return null;
  return Number.parseInt(selectedValue, 10);
}

/** Convert Zinc's response field back into the exact value rendered by the select. */
export function leadTimeResponseToSelection(hours: number | null | undefined): string | undefined {
  return hours == null ? undefined : String(hours);
}
