/**
 * HTTP access for the invoice endpoints.
 *
 * WHY HAND-ROLLED. The generated client (`src/lib/api/core/Api.ts`) is produced
 * by `task sdk-gen` against a LIVE API, so zinc's invoice endpoints cannot
 * appear in it until they are deployed. Every call here follows the SDK's own
 * conventions (same base URL, same bearer, same problem-details handling) so
 * swapping to the generated methods later is a mechanical change.
 *
 * The document endpoints could never use the SDK regardless: they return
 * `text/html`, and the SDK is typed for JSON responses only — the same reason
 * `withdrawal-export.ts` exists.
 *
 * `fetch` is injected rather than reached for globally so every path below is
 * unit-testable without a browser.
 */

import type {
  InvoiceComputedRes,
  InvoiceDocumentRes,
  InvoiceInputRowRes,
  InvoiceSettingsRes,
  InvoiceSummaryRes,
  PreviewInvoiceReq,
} from './invoices';

export type Fetch = typeof fetch;

export interface ApiContext {
  baseUrl: string;
  accessToken: string;
  fetch: Fetch;
}

/**
 * Every call resolves to this rather than throwing.
 *
 * `reauth` is separate from an ordinary failure on purpose: a 401 means the
 * bearer the client believed was live was rejected server-side (clock skew,
 * revoked session, key rotation), and the only recovery is to sign in again.
 * Showing a toast there would strand the operator on a dead button.
 */
export type ApiResult<T> = { ok: true; value: T } | { ok: false; reauth?: true; message: string };

function isProblemDetails(value: unknown): value is { detail?: unknown; title?: unknown } {
  return typeof value === 'object' && value !== null && 'status' in value && 'title' in value && 'type' in value;
}

/**
 * The most specific message the response carries.
 *
 * zinc's problem-details writer emits `detail` with the actual reason —
 * "DueDate cannot be before IssueDate", or the full list of attestation
 * mismatches. Falling back to the generic message loses exactly the
 * information the operator needs, so it is only used when there is no body.
 */
export async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (isProblemDetails(body)) {
      if (typeof body.detail === 'string' && body.detail !== '') return body.detail;
      if (typeof body.title === 'string' && body.title !== '') return body.title;
    }
  } catch {
    // Non-JSON or empty body — the generic message below is all there is.
  }
  return fallback;
}

const API_PREFIX = '/api/v1.0/Invoice';

export function invoiceUrl(baseUrl: string, path: string, query?: Record<string, string>): string {
  const base = `${baseUrl.replace(/\/+$/, '')}${API_PREFIX}${path}`;
  if (query == null) return base;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v == null || v === '') continue;
    params.set(k, v);
  }
  const q = params.toString();
  return q === '' ? base : `${base}?${q}`;
}

async function call<T>(
  ctx: ApiContext,
  path: string,
  fallback: string,
  init: RequestInit & { query?: Record<string, string> } = {},
): Promise<ApiResult<T>> {
  const { query, ...rest } = init;
  let res: Response;
  try {
    res = await ctx.fetch(invoiceUrl(ctx.baseUrl, path, query), {
      ...rest,
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        // The JSON entries are load-bearing even on the HTML routes: zinc's
        // problem-details writer only emits a body when the Accept list
        // admits JSON, so asking for `text/html` alone turns every error into
        // an empty body. Documented at withdrawal-export.ts:264.
        Accept: 'application/json, application/problem+json',
        ...(rest.body == null ? {} : { 'Content-Type': 'application/json' }),
        ...(rest.headers ?? {}),
      },
    });
  } catch (e) {
    // Network-level failure — `fetch` rejects before there is a response to
    // read a problem out of.
    console.error(e);
    return { ok: false, message: fallback };
  }

  if (res.status === 401) return { ok: false, reauth: true, message: fallback };
  if (!res.ok) return { ok: false, message: await errorMessage(res, fallback) };

  // 204 has no body; every endpoint here returns one, but a null-body 200
  // must not become a JSON parse error shown to the operator.
  if (res.status === 204) return { ok: true, value: undefined as T };
  return { ok: true, value: (await res.json()) as T };
}

/** Everything zinc can gather for one SGT month. */
export function getInputs(ctx: ApiContext, month: string, fallback: string): Promise<ApiResult<InvoiceInputRowRes>> {
  return call(ctx, '/inputs', fallback, { method: 'GET', query: { Month: month } });
}

/** The agreed commercial terms in force right now, plus anything queued. */
export function getSettings(ctx: ApiContext, fallback: string): Promise<ApiResult<InvoiceSettingsRes>> {
  return call(ctx, '/settings', fallback, { method: 'GET' });
}

/** Compute a month without persisting anything. */
export function preview(
  ctx: ApiContext,
  req: PreviewInvoiceReq,
  fallback: string,
): Promise<ApiResult<InvoiceComputedRes>> {
  return call(ctx, '/preview', fallback, { method: 'POST', body: JSON.stringify(req) });
}

/** Stored invoices, newest first once sorted client-side. */
export function list(ctx: ApiContext, fallback: string): Promise<ApiResult<InvoiceSummaryRes[]>> {
  return call(ctx, '', fallback, { method: 'GET' });
}

export function get(ctx: ApiContext, id: string, fallback: string): Promise<ApiResult<InvoiceDocumentRes>> {
  return call(ctx, `/${id}`, fallback, { method: 'GET' });
}

export interface SaveDraftReq {
  periodMonth: string;
  seq: string;
  ticketBasis: string;
  issueDate: string;
  dueDate: string;
  inputs: PreviewInvoiceReq;
}

/** Save (replacing) the draft for a month. Nothing is issued by this. */
export function saveDraft(
  ctx: ApiContext,
  req: SaveDraftReq,
  fallback: string,
): Promise<ApiResult<InvoiceDocumentRes>> {
  return call(ctx, '/drafts', fallback, { method: 'POST', body: JSON.stringify(req) });
}

/**
 * Freeze a draft as the issued invoice for its month.
 *
 * IRREVERSIBLE in the sense that matters: after this the figures never
 * recompute, so re-opening the month shows what was actually paid rather than
 * what today's engine would say. Withdrawing it is a void with a reason, not
 * a delete.
 */
export function issue(ctx: ApiContext, id: string, fallback: string): Promise<ApiResult<InvoiceDocumentRes>> {
  return call(ctx, `/${id}/issue`, fallback, { method: 'POST' });
}

export function voidInvoice(
  ctx: ApiContext,
  id: string,
  reason: string,
  fallback: string,
): Promise<ApiResult<InvoiceDocumentRes>> {
  return call(ctx, `/${id}/void`, fallback, { method: 'POST', body: JSON.stringify({ reason }) });
}

/**
 * Open a partner's document in a new tab.
 *
 * Served as HTML, not PDF, because the browser's own print engine IS what
 * produced the issued PDFs — same engine, same stylesheet, Ctrl+P → Save as
 * PDF. A plain `window.open` cannot carry the bearer token, so the document is
 * fetched here and handed to the tab as an object URL.
 */
export async function openDocument(
  ctx: ApiContext,
  path: string,
  fallback: string,
  present: (blob: Blob) => void,
  init: RequestInit = {},
): Promise<ApiResult<void>> {
  let res: Response;
  try {
    res = await ctx.fetch(invoiceUrl(ctx.baseUrl, path), {
      ...init,
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        Accept: 'text/html, application/problem+json, application/json',
        ...(init.body == null ? {} : { 'Content-Type': 'application/json' }),
        ...(init.headers ?? {}),
      },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, message: fallback };
  }

  if (res.status === 401) return { ok: false, reauth: true, message: fallback };
  if (!res.ok) return { ok: false, message: await errorMessage(res, fallback) };

  present(await res.blob());
  return { ok: true, value: undefined };
}

/** The stored invoice's document for one partner. */
export function openStoredDocument(
  ctx: ApiContext,
  id: string,
  suffix: string,
  fallback: string,
  present: (blob: Blob) => void,
): Promise<ApiResult<void>> {
  const url = `/${id}/document?suffix=${encodeURIComponent(suffix)}`;
  return openDocument(ctx, url, fallback, present, { method: 'GET' });
}

/** The same document for a month that has not been saved yet. */
export function openPreviewDocument(
  ctx: ApiContext,
  req: PreviewInvoiceReq,
  suffix: string,
  fallback: string,
  present: (blob: Blob) => void,
): Promise<ApiResult<void>> {
  const url = `/preview/document?suffix=${encodeURIComponent(suffix)}`;
  return openDocument(ctx, url, fallback, present, { method: 'POST', body: JSON.stringify(req) });
}
