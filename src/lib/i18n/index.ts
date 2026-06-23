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
import { init, register, locale, waitLocale } from 'svelte-i18n';
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

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale };
