import '$lib/i18n';
import { browser } from '$app/environment';
import { locale as i18nLocale, waitLocale } from 'svelte-i18n';
import { DEFAULT_LOCALE, isSupportedLocale } from '$lib/i18n/resolve';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
  const locale = isSupportedLocale(data?.locale) ? data.locale : DEFAULT_LOCALE;

  // Warm the active catalog (and the `en` fallback) before first paint so SSR
  // renders fully-translated chrome with no flash. This never mutates the
  // process-global locale on the server — formatting passes the locale
  // explicitly via `$lang`.
  await Promise.all([waitLocale(locale), waitLocale(DEFAULT_LOCALE)]);

  // Mirror the global locale on the client only (safe — single user per
  // browser). The server render is driven solely by `$page.data.locale`.
  if (browser) i18nLocale.set(locale);

  return { ...data, locale };
};
