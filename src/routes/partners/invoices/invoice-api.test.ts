import { describe, expect, it, vi } from 'vitest';
import {
  errorMessage,
  getInputs,
  invoiceUrl,
  issue,
  openStoredDocument,
  preview,
  saveDraft,
  type ApiContext,
} from './invoice-api';
import type { PreviewInvoiceReq } from './invoices';

function ctx(res: Response | Error, fetchSpy = vi.fn()): { ctx: ApiContext; fetch: ReturnType<typeof vi.fn> } {
  const f = fetchSpy.mockImplementation(() => (res instanceof Error ? Promise.reject(res) : Promise.resolve(res)));
  return {
    ctx: { baseUrl: 'https://api.example.com', accessToken: 'tok', fetch: f as unknown as typeof fetch },
    fetch: f,
  };
}

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init });

describe('invoiceUrl', () => {
  it('builds against the v1.0 invoice route', () => {
    expect(invoiceUrl('https://api.example.com', '/inputs', { Month: '08-2026' })).toBe(
      'https://api.example.com/api/v1.0/Invoice/inputs?Month=08-2026',
    );
  });

  it('tolerates a trailing slash on the base', () => {
    expect(invoiceUrl('https://api.example.com/', '')).toBe('https://api.example.com/api/v1.0/Invoice');
  });

  // An empty value is a real filter to zinc, not an absent one.
  it('omits empty query values rather than sending them blank', () => {
    expect(invoiceUrl('https://api.example.com', '/inputs', { Month: '' })).toBe(
      'https://api.example.com/api/v1.0/Invoice/inputs',
    );
  });
});

describe('errorMessage', () => {
  // zinc's problem detail carries the actual reason. Falling back to the
  // generic message loses exactly what the operator needs to fix.
  it('prefers the problem detail', async () => {
    const res = json({ type: 't', title: 'Bad Request', status: 400, detail: 'DueDate cannot be before IssueDate' });
    expect(await errorMessage(res, 'generic')).toBe('DueDate cannot be before IssueDate');
  });

  it('falls back to the title when there is no detail', async () => {
    expect(await errorMessage(json({ type: 't', title: 'Conflict', status: 409 }), 'generic')).toBe('Conflict');
  });

  it('falls back to the generic message on a non-JSON body', async () => {
    expect(await errorMessage(new Response('<html>502</html>', { status: 502 }), 'generic')).toBe('generic');
  });

  it('falls back to the generic message on an empty body', async () => {
    expect(await errorMessage(new Response(null, { status: 500 }), 'generic')).toBe('generic');
  });
});

describe('requests', () => {
  it('sends the bearer and asks for problem details', async () => {
    const { ctx: c, fetch } = ctx(json({ month: '08-2026' }));
    await getInputs(c, '08-2026', 'failed');

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/v1.0/Invoice/inputs?Month=08-2026');
    expect(init.headers.Authorization).toBe('Bearer tok');
    // The JSON entries are load-bearing: zinc emits a problem body only when
    // the Accept list admits JSON.
    expect(init.headers.Accept).toContain('application/problem+json');
  });

  it('sets a JSON content type only when there is a body', async () => {
    const { ctx: c, fetch } = ctx(json({}));
    await issue(c, 'abc', 'failed');
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBeUndefined();

    const { ctx: c2, fetch: f2 } = ctx(json({}));
    await preview(c2, {} as PreviewInvoiceReq, 'failed');
    expect(f2.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
  });

  it('posts the draft to the drafts route', async () => {
    const { ctx: c, fetch } = ctx(json({ id: 'x' }));
    const req = {
      periodMonth: '01-08-2026',
      seq: '0801',
      ticketBasis: 'statusToday',
      issueDate: '02-09-2026',
      dueDate: '16-09-2026',
      inputs: {} as PreviewInvoiceReq,
    };
    await saveDraft(c, req, 'failed');
    expect(fetch.mock.calls[0][0]).toBe('https://api.example.com/api/v1.0/Invoice/drafts');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(req);
  });

  it('returns the parsed body on success', async () => {
    const { ctx: c } = ctx(json({ month: '08-2026', grossDeposits: 70413 }));
    const r = await getInputs(c, '08-2026', 'failed');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.grossDeposits).toBe(70413);
  });
});

describe('failures', () => {
  // A 401 means the bearer the client believed was live was rejected. A toast
  // would strand the operator on a dead button; the caller re-authenticates.
  it('flags a 401 as needing re-authentication, not as an error message', async () => {
    const { ctx: c } = ctx(new Response(null, { status: 401 }));
    const r = await getInputs(c, '08-2026', 'failed');
    expect(r).toMatchObject({ ok: false, reauth: true });
  });

  it('surfaces the servers reason on a rejected request', async () => {
    const { ctx: c } = ctx(
      json(
        { type: 't', title: 'Conflict', status: 409, detail: 'tickets attested 5625 but computes to 5265' },
        { status: 409 },
      ),
    );
    const r = await preview(c, {} as PreviewInvoiceReq, 'failed');
    expect(r).toEqual({ ok: false, message: 'tickets attested 5625 but computes to 5265' });
  });

  it('does not throw when the network is down', async () => {
    const { ctx: c } = ctx(new TypeError('Failed to fetch'));
    const r = await getInputs(c, '08-2026', 'could not reach the API');
    expect(r).toEqual({ ok: false, message: 'could not reach the API' });
  });
});

describe('openStoredDocument', () => {
  it('asks for HTML and hands the blob to the presenter', async () => {
    const present = vi.fn();
    const { ctx: c, fetch } = ctx(new Response('<html>invoice</html>', { status: 200 }));

    const r = await openStoredDocument(c, 'inv-1', 'C', 'failed', present);

    expect(r.ok).toBe(true);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/v1.0/Invoice/inv-1/document?suffix=C');
    expect(init.headers.Accept).toContain('text/html');
    expect(present).toHaveBeenCalledOnce();
  });

  it('escapes the partner suffix', async () => {
    const { ctx: c, fetch } = ctx(new Response('<html></html>'));
    await openStoredDocument(c, 'inv-1', 'A&B', 'failed', vi.fn());
    expect(fetch.mock.calls[0][0]).toContain('suffix=A%26B');
  });

  // A 404 here is a real answer: the partner may not have been on the
  // partnership that month. It must reach the operator, not open a blank tab.
  it('does not present anything when the document is missing', async () => {
    const present = vi.fn();
    const { ctx: c } = ctx(
      json({ type: 't', title: 'Not Found', status: 404, detail: "no partner with suffix 'X'" }, { status: 404 }),
    );

    const r = await openStoredDocument(c, 'inv-1', 'X', 'failed', present);

    expect(r).toEqual({ ok: false, message: "no partner with suffix 'X'" });
    expect(present).not.toHaveBeenCalled();
  });
});
