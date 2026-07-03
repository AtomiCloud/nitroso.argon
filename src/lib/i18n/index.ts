/**
 * svelte-i18n runtime wiring.
 *
 * SSR-safety contract (see ./README.md):
 *   - Catalogs are registered lazily and `init` runs once at module load.
 *   - We NEVER call `locale.set()` on the server. The server render is driven
 *     entirely by `event.locals.locale` → `$page.data.locale`, and every
 *     formatting call passes `{ locale: $lang }` explicitly so it never reads
 *     the process-global `$locale`.
 *   - `lang` is request-scoped: it derives from the (context-scoped) `page`
 *     store on the server, with a browser-only override (`clientLocale`) for
 *     instant, no-reload switching. `clientLocale` is only ever written in the
 *     browser, so it can never bleed across server requests.
 */
import { derived, writable } from 'svelte/store';
import { init, register, locale, waitLocale, _, unwrapFunctionStore } from 'svelte-i18n';
import { browser } from '$app/environment';
import { page } from '$app/stores';
import { DEFAULT_LOCALE, LOCALE_COOKIE, SUPPORTED_LOCALES, isSupportedLocale, type SupportedLocale } from './resolve';

register('en', () => import('./locales/en.json'));
register('zh', () => import('./locales/zh.json'));
register('ms', () => import('./locales/ms.json'));

init({
  fallbackLocale: DEFAULT_LOCALE,
  initialLocale: DEFAULT_LOCALE,
});

/**
 * Browser-only override for instant switching. Stays `null` on the server, so
 * the server render always falls through to `$page.data.locale`.
 */
const clientLocale = writable<SupportedLocale | null>(null);

/**
 * The active locale for the current request/render.
 *
 * On the server this is purely `$page.data.locale` (request-scoped). On the
 * client, a picker selection takes precedence until the next full reload.
 */
export const lang = derived([page, clientLocale], ([$page, $clientLocale]) => {
  if ($clientLocale != null) return $clientLocale;
  const fromPage = $page?.data?.locale as string | undefined;
  return isSupportedLocale(fromPage) ? fromPage : DEFAULT_LOCALE;
});

/**
 * Persist + apply a language choice on the client.
 *
 * Loads the target catalog before flipping the override so there is no
 * missing-key flash, writes the persistence cookie, syncs the svelte-i18n
 * global locale, and updates `<html lang>`. No-op on the server.
 */
export async function setLocale(next: SupportedLocale): Promise<void> {
  if (!browser) return;
  if (!isSupportedLocale(next)) return;

  await waitLocale(next);

  // 1 year, root path, lax — a plain persistence cookie (no sensitive data).
  // document.cookie is the idiomatic client-side setter here; no cookie lib is
  // warranted for a single non-sensitive preference cookie.
  // eslint-disable-next-line unicorn/no-document-cookie
  document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
  clientLocale.set(next);
  // Safe on the client: keeps svelte-i18n's own global in sync for any
  // consumer that relies on the active locale rather than passing it.
  locale.set(next);
  document.documentElement.lang = next;
}

/**
 * Translate a frontend-owned load-error fallback string from inside a
 * SvelteKit `load` function (universal `+page.ts` or `+page.server.ts`).
 *
 * Plan 2 / FR3: load-error copy *emitted by the loaders themselves* is
 * localized, while backend/API RFC7807 `problem_details` strings (parsed from
 * an HTTP error body) stay English. This helper only ever localizes the local
 * fallback passed to `toResult(...)` — the value rendered as `prob.detail` when
 * the local request wrapper throws a non-HTTP exception.
 *
 * SSR-safe by construction: it never calls `locale.set()`. It warms the target
 * catalog with `waitLocale` and formats with an explicit `{ locale }`, mirroring
 * the `{ locale: $lang }` contract every component formatting call already uses,
 * so it can never bleed the locale across concurrent server requests.
 *
 * The unwrapped formatter is acquired **once** at module load and reused for the
 * process lifetime (the documented `unwrapFunctionStore` usage for code outside
 * components). `unwrapFunctionStore(_)` subscribes to the `_`/`$format` store and
 * returns a formatter with a `.freeze()` unsubscribe; acquiring it per call would
 * leak one subscription per invocation. A single long-lived subscription keeps
 * the formatter's dictionary in sync as catalogs load (via `waitLocale`) while
 * holding exactly one bounded, intentional subscription — and we always pass an
 * explicit `{ locale }`, so the shared formatter never reads the global `$locale`.
 *
 * It is `export`ed so plain `.ts` modules that have no Svelte store access — e.g.
 * the Zod schema factory in `src/lib/components/entities/Wallets/transfer.ts` —
 * can localize their validation messages with
 * `formatStandalone(key, { locale, values })`, mirroring the `{ locale: $lang }`
 * contract every component formatting call uses. Callers build the schema
 * reactively from `$lang`, so it stays SSR-safe (the catalog is warmed by
 * `+layout.ts`'s `waitLocale` before first paint) and never calls `locale.set()`.
 */
export const formatStandalone = unwrapFunctionStore(_);

export async function loadError(
  requestLocale: string | undefined,
  key: string,
  values?: Record<string, string | number | boolean | Date>,
): Promise<string> {
  const l = isSupportedLocale(requestLocale) ? requestLocale : DEFAULT_LOCALE;
  await waitLocale(l);
  return formatStandalone(key, { locale: l, values });
}

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale };
export {
  formatMoney,
  formatNumber,
  formatDate,
  formatDateTime,
  formatTime,
  formatClockTime,
  formatCalendarDate,
} from './format';
