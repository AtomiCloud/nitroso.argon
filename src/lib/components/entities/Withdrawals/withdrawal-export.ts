/**
 * Helpers for the withdrawals CSV export.
 *
 * The export endpoint (`GET {zinc}/api/v1.0/Withdrawal/export`) is not in the
 * generated client: the SDK is typed for JSON responses only, and this route
 * returns `text/csv`. These helpers keep the URL/filename logic out of the
 * component so the request and download behavior can be unit tested without a
 * browser DOM.
 */

function isProblemDetails(
  value: unknown,
): value is { detail?: unknown; status: unknown; title: unknown; type: unknown } {
  return typeof value === 'object' && value !== null && 'status' in value && 'title' in value && 'type' in value;
}

/**
 * The subset of the withdrawals list filters the export honours.
 *
 * Keys are the zinc-side casing used by `api.vWithdrawalDetail` so the export
 * reads the same rows the page is showing. `Limit`/`Skip` are deliberately
 * absent — an export is never paginated.
 */
export interface WithdrawalExportFilters {
  Id?: string;
  UserId?: string;
  CompleterId?: string;
  Min?: string;
  Max?: string;
  Status?: string;
  Before?: string;
  After?: string;
}

/**
 * The URL search param each zinc filter is read from. This is the single
 * source of truth for the mapping: the list loader and the export both derive
 * from it, so a filter can never reach one and not the other.
 *
 * Declaring it as a full `Record` over the filter keys makes the mapping
 * exhaustive by construction — adding a field to `WithdrawalExportFilters`
 * without adding it here is a type error rather than a silently dropped
 * filter.
 */
const EXPORT_PARAM_SOURCES: Record<keyof WithdrawalExportFilters, string> = {
  Id: 'id',
  UserId: 'userId',
  CompleterId: 'completerId',
  Min: 'min',
  Max: 'max',
  Status: 'status',
  Before: 'before',
  After: 'after',
};

/**
 * Order the query params are emitted in, so the produced URL is stable and
 * assertable in tests.
 */
const EXPORT_PARAM_ORDER = Object.keys(EXPORT_PARAM_SOURCES) as (keyof WithdrawalExportFilters)[];

/**
 * Read the applied server-side filters off a URL.
 *
 * Both the list loader and the export use this, so the downloaded CSV always
 * covers the same rows the page is showing. Reading the URL (rather than live
 * input state) is deliberate: the text inputs are debounced, and the URL is
 * the applied set.
 */
export function withdrawalFiltersFromUrl(url: URL): Required<WithdrawalExportFilters> {
  const filters = {} as Required<WithdrawalExportFilters>;
  for (const [key, param] of Object.entries(EXPORT_PARAM_SOURCES) as [keyof WithdrawalExportFilters, string][]) {
    // Trim HERE, at the one place both consumers read from. zinc does not
    // trim server-side, so a stray space is a real filter to it: `?userId=+`
    // would make the table match nothing while an export that trimmed
    // separately downloaded the entire ledger — the two disagreeing, in the
    // dangerous direction, on a document someone files taxes from.
    filters[key] = (url.searchParams.get(param) ?? '').trim();
  }
  return filters;
}

/**
 * Build the export query string from the filters currently applied on the page.
 *
 * Empty / whitespace-only filters are omitted rather than sent blank: zinc
 * treats a present-but-empty value as a filter, which would export nothing.
 */
export function buildExportQuery(filters: WithdrawalExportFilters): string {
  const params = new URLSearchParams();
  for (const key of EXPORT_PARAM_ORDER) {
    const value = filters[key];
    if (value == null) continue;
    const trimmed = value.trim();
    if (trimmed.length === 0) continue;
    // Mirror the list loader's `parseFloat` exactly, INCLUDING an unparseable
    // value becoming `NaN`. Dropping it instead would be worse than useless
    // here: the table would 400 on `?min=abc` while the export quietly
    // succeeded with the bound removed, handing someone a wider ledger than
    // the screen they exported it from. Sending it through means both fail
    // the same way, and the reader gets zinc's validation message.
    if (key === 'Min' || key === 'Max') {
      params.set(key, String(parseFloat(trimmed)));
      continue;
    }
    params.set(key, trimmed);
  }
  return params.toString();
}

/**
 * Full export URL for the given API base (`{scheme}://{domain}`, no trailing
 * slash required) and filters.
 */
export function buildExportUrl(baseUrl: string, filters: WithdrawalExportFilters): string {
  const base = `${baseUrl.replace(/\/+$/, '')}/api/v1.0/Withdrawal/export`;
  const query = buildExportQuery(filters);
  return query.length === 0 ? base : `${base}?${query}`;
}

/**
 * Strip anything that could escape the download directory or confuse the OS,
 * so a server-supplied filename can never be used as a path.
 *
 * Control characters go too: a raw CR/LF smuggled through the header would
 * otherwise land in the anchor's `download` attribute.
 */
function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[/\\]/g, '_')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  const trimmed = cleaned.trim();
  return trimmed === '' || trimmed === '.' || trimmed === '..' ? '' : trimmed;
}

/**
 * Pull the download filename out of a `Content-Disposition` header.
 *
 * Prefers the RFC 5987 `filename*=charset'lang'value` form, falling back to
 * the plain quoted or bare `filename=`. zinc only ever emits the plain quoted
 * form today (it reduces the name to `[A-Za-z0-9_-]`), so the extended branch
 * is defensive rather than exercised in production.
 *
 * Returns `null` when the header is absent or carries no usable name — the
 * caller then uses {@link fallbackExportFilename}.
 */
export function filenameFromContentDisposition(header: string | null | undefined): string | null {
  if (header == null) return null;

  // RFC 5987 is `charset'language'value`, and BOTH the charset and the
  // language tag are free-form — `filename*=UTF-8'en'x.csv` is conformant.
  // Matching only the empty-language UTF-8 form would drop an otherwise
  // valid server-chosen name on the floor.
  const extended = /filename\*\s*=\s*[^';]*'[^';]*'([^;]+)/i.exec(header);
  if (extended?.[1] != null) {
    let decoded = extended[1].trim();
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // A malformed percent-escape is not worth failing the download over —
      // fall through with the raw value and let sanitising decide.
    }
    const safe = sanitizeFilename(decoded);
    if (safe !== '') return safe;
  }

  const quoted = /filename\s*=\s*"([^"]*)"/i.exec(header);
  if (quoted?.[1] != null) {
    const safe = sanitizeFilename(quoted[1]);
    // A quoted filename is authoritative: do not re-read it as a bare value
    // when it sanitises away, otherwise `filename=""` becomes the literal
    // filename `""`.
    return safe === '' ? null : safe;
  }

  const bare = /filename\s*=\s*([^;]+)/i.exec(header);
  if (bare?.[1] != null) {
    const safe = sanitizeFilename(bare[1]);
    if (safe !== '') return safe;
  }

  return null;
}

/**
 * Local filename to save under when the response carries no usable
 * `Content-Disposition`.
 *
 * Mirrors the page's own date filters (`dd-MM-yyyy`) so the file says what it
 * covers; an unbounded end of the range reads as `all`.
 */
export function fallbackExportFilename(after?: string, before?: string): string {
  const from = (after ?? '').trim();
  const to = (before ?? '').trim();
  if (from === '' && to === '') return 'withdrawals-all.csv';
  // These bounds come straight off the URL, so they get the same sanitising
  // as a server-supplied name — this is the branch that actually runs, since
  // the API is cross-origin and Content-Disposition is only readable when
  // zinc exposes it.
  const name = `withdrawals-${from === '' ? 'all' : from}_${to === '' ? 'all' : to}.csv`;
  const safe = sanitizeFilename(name);
  return safe === '' ? 'withdrawals-all.csv' : safe;
}

export interface WithdrawalExportMessages {
  forbidden: string;
  unavailable: string;
  failed: string;
}

/**
 * `reauth` asks the caller to restart sign-in rather than show a message: the
 * server rejected the bearer even though it looked live client-side (clock
 * skew, a revoked session, key rotation), so a toast would leave the admin
 * with a dead button and no way back in.
 */
export type WithdrawalExportResult =
  | { ok: true }
  | { ok: false; reauth: true }
  | { ok: false; reauth?: false; message: string };

export interface WithdrawalExportRequest {
  baseUrl: string;
  filters: WithdrawalExportFilters;
  accessToken: string;
  messages: WithdrawalExportMessages;
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  download: (blob: Blob, name: string) => void;
}

/**
 * Produce the localized message for a failed export response. RFC 7807 detail
 * remains the most useful message when the endpoint supplies one.
 */
export async function exportErrorMessage(res: Response, messages: WithdrawalExportMessages): Promise<string> {
  if (res.status === 403) return messages.forbidden;
  if (res.status === 404) return messages.unavailable;
  try {
    const body = await res.json();
    if (isProblemDetails(body) && typeof body.detail === 'string' && body.detail !== '') return body.detail;
  } catch {
    // Non-JSON (or empty) bodies use the generic localized message below.
  }
  return messages.failed;
}

/**
 * Fetch the export with the same bearer credential as the rest of the app and
 * hand a successful CSV blob to the injected browser-download callback.
 */
export async function requestWithdrawalExport({
  baseUrl,
  filters,
  accessToken,
  messages,
  fetch,
  download,
}: WithdrawalExportRequest): Promise<WithdrawalExportResult> {
  const res = await fetch(buildExportUrl(baseUrl, filters), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // The problem media types are not optional padding: zinc's problem
      // details writer only emits a body when the Accept list admits JSON.
      // Asking for `text/csv` alone would make every error an empty body and
      // reduce a precise "Status must be one of: ..." to a generic failure.
      Accept: 'text/csv, application/problem+json, application/json',
    },
  });

  // 401 means the bearer was rejected server-side despite passing the
  // client's own expiry check — recoverable only by signing in again.
  if (res.status === 401) return { ok: false, reauth: true };

  if (!res.ok) return { ok: false, message: await exportErrorMessage(res, messages) };

  const blob = await res.blob();
  const name =
    filenameFromContentDisposition(res.headers.get('content-disposition')) ??
    fallbackExportFilename(filters.After, filters.Before);
  download(blob, name);
  return { ok: true };
}

export const OBJECT_URL_REVOKE_DELAY_MS = 1000;

export interface DownloadAnchor {
  href: string;
  download: string;
  rel: string;
  click: () => void;
  remove: () => void;
}

/**
 * Generic over the anchor so a real `HTMLAnchorElement` satisfies it directly:
 * the caller passes `document.createElement("a")` and `document.body.append`
 * without casting, while a test can pass a plain object instead. The seam
 * exists so the cleanup guarantees below (anchor always removed, object URL
 * always revoked, even when the DOM calls throw) are actually testable.
 */
export interface BrowserDownload<A extends DownloadAnchor = DownloadAnchor> {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  createAnchor: () => A;
  append: (anchor: A) => void;
  defer: (callback: () => void, delayMs: number) => void;
}

/** Save a blob through a synthetic anchor and revoke its object URL later. */
export function triggerBlobDownload<A extends DownloadAnchor>(
  blob: Blob,
  name: string,
  browser: BrowserDownload<A>,
): void {
  const url = browser.createObjectURL(blob);
  try {
    const anchor = browser.createAnchor();
    anchor.href = url;
    anchor.download = name;
    anchor.rel = 'noopener';
    try {
      browser.append(anchor);
      anchor.click();
    } finally {
      anchor.remove();
    }
  } finally {
    // A short delay gives browsers time to begin consuming the object URL.
    browser.defer(() => browser.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS);
  }
}
