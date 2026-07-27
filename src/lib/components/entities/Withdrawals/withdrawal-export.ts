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
 * Order the query params are emitted in, so the produced URL is stable and
 * assertable in tests.
 */
const EXPORT_PARAM_ORDER: (keyof WithdrawalExportFilters)[] = [
  'Id',
  'UserId',
  'CompleterId',
  'Min',
  'Max',
  'Status',
  'Before',
  'After',
];

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
    // The list loader parses these before passing them to the generated API
    // client. Keep valid URL values semantically identical for the export.
    if (key === 'Min' || key === 'Max') {
      const parsed = parseFloat(trimmed);
      if (!Number.isFinite(parsed)) continue;
      params.set(key, String(parsed));
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
 * Prefers the RFC 5987 `filename*=UTF-8''…` form (zinc emits it when the name
 * carries non-ASCII), falling back to the plain quoted or bare `filename=`.
 * Returns `null` when the header is absent or carries no usable name — the
 * caller then uses {@link fallbackExportFilename}.
 */
export function filenameFromContentDisposition(header: string | null | undefined): string | null {
  if (header == null) return null;

  const extended = /filename\*\s*=\s*(?:UTF-8)''([^;]+)/i.exec(header);
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
  return `withdrawals-${from === '' ? 'all' : from}_${to === '' ? 'all' : to}.csv`;
}

export interface WithdrawalExportMessages {
  forbidden: string;
  unavailable: string;
  failed: string;
}

export type WithdrawalExportResult = { ok: true } | { ok: false; message: string };

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
      Accept: 'text/csv',
    },
  });

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

export interface BrowserDownload {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  createAnchor: () => DownloadAnchor;
  append: (anchor: DownloadAnchor) => void;
  defer: (callback: () => void, delayMs: number) => void;
}

/** Save a blob through a synthetic anchor and revoke its object URL later. */
export function triggerBlobDownload(blob: Blob, name: string, browser: BrowserDownload): void {
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
