/**
 * Pure, dependency-free locale negotiation.
 *
 * This module must stay free of any SvelteKit / svelte-i18n imports so it can be
 * unit-tested in isolation and reused on both the server (request hook) and the
 * client (picker).
 */

export const SUPPORTED_LOCALES = ['en', 'zh', 'ms'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Name of the cookie that persists the user's explicit language choice. */
export const LOCALE_COOKIE = 'locale';

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return value != null && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

interface NegotiateInput {
  cookie?: string | null;
  acceptLanguage?: string | null;
}

/**
 * Resolve the effective locale for a request.
 *
 * Precedence:
 *   1. A present cookie is authoritative. A valid supported value wins; a
 *      present-but-unsupported (tampered) cookie falls back to `en` and is NOT
 *      allowed to defer to Accept-Language.
 *   2. Best match of the `Accept-Language` header against the supported set.
 *   3. `en` (default).
 */
export function negotiateLocale({ cookie, acceptLanguage }: NegotiateInput): SupportedLocale {
  // 1. A present cookie short-circuits everything.
  if (cookie != null && cookie.length > 0) {
    return isSupportedLocale(cookie) ? cookie : DEFAULT_LOCALE;
  }

  // 2. Accept-Language best match.
  const fromHeader = bestMatchFromAcceptLanguage(acceptLanguage);
  if (fromHeader != null) return fromHeader;

  // 3. Default.
  return DEFAULT_LOCALE;
}

/**
 * Parse an `Accept-Language` header and return the highest-quality supported
 * locale, or null if none matches.
 *
 * Region/script subtags collapse to their primary subtag (e.g. `zh-CN`,
 * `zh-Hans` → `zh`; `en-US` → `en`). Quality values order the candidates;
 * entries with `q=0` are explicitly not acceptable and are skipped.
 */
function bestMatchFromAcceptLanguage(header?: string | null): SupportedLocale | null {
  if (header == null || header.trim().length === 0) return null;

  const candidates = header
    .split(',')
    .map(part => {
      const [tag, ...params] = part.trim().split(';');
      let q = 1;
      for (const param of params) {
        const match = param.trim().match(/^q=(\d+(?:\.\d+)?)$/);
        if (match) q = Number.parseFloat(match[1]);
      }
      return { tag: tag.trim().toLowerCase(), q };
    })
    .filter(c => c.tag.length > 0 && c.q > 0)
    // Stable sort by descending quality; preserves source order for ties.
    .sort((a, b) => b.q - a.q);

  for (const { tag } of candidates) {
    const primary = tag.split('-')[0];
    if (isSupportedLocale(primary)) return primary;
  }

  return null;
}
