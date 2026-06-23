import { z } from 'zod';
import { formatStandalone, type SupportedLocale } from '$lib/i18n';

/**
 * Build the admin transfer (in/out/promo) form schema with its validation
 * messages localized for `locale` (Plan 2 / AC5).
 *
 * The messages are sourced from the `validation.transfer.*` catalog keys and
 * resolved through the standalone formatter (no Svelte store access is available
 * in this plain `.ts` module), with an explicit `{ locale }` so it stays
 * SSR-safe. Consumers (AdminIn/AdminOut/Promo) rebuild this reactively from
 * `$lang`, so the rendered error follows the active language.
 */
export function makeTransferSchema(locale: SupportedLocale) {
  return z.object({
    amount: z.coerce
      .number()
      .gt(0, formatStandalone('validation.transfer.amountGt', { locale, values: { min: 0 } }))
      .finite(formatStandalone('validation.transfer.amountFinite', { locale })),

    desc: z
      .string()
      .min(2, formatStandalone('validation.transfer.descMin', { locale, values: { min: 2 } }))
      .max(4096, formatStandalone('validation.transfer.descMax', { locale, values: { max: 4096 } })),
  });
}

type TransferObject = z.infer<ReturnType<typeof makeTransferSchema>>;

export type { TransferObject };
