import { describe, expect, it, vi } from 'vitest';
import {
  buildExportQuery,
  buildExportUrl,
  exportErrorMessage,
  fallbackExportFilename,
  filenameFromContentDisposition,
  OBJECT_URL_REVOKE_DELAY_MS,
  requestWithdrawalExport,
  triggerBlobDownload,
  withdrawalFiltersFromUrl,
  type WithdrawalExportFilters,
  type WithdrawalExportMessages,
} from './withdrawal-export';

describe('withdrawalFiltersFromUrl', () => {
  // The list loader and the export both read filters through this, so a
  // divergence here would silently export a different set of rows than the
  // table shows — the worst possible failure for a tax document.
  it('maps every url search param to its zinc filter key', () => {
    const url = new URL(
      'https://argon.example.com/withdrawals?id=w-1&userId=u-1&completerId=c-1&min=10&max=20&status=Pending&before=31-12-2026&after=01-01-2026',
    );

    expect(withdrawalFiltersFromUrl(url)).toEqual({
      Id: 'w-1',
      UserId: 'u-1',
      CompleterId: 'c-1',
      Min: '10',
      Max: '20',
      Status: 'Pending',
      Before: '31-12-2026',
      After: '01-01-2026',
    });
  });

  it('trims values so the table and the export cannot disagree', () => {
    // zinc does not trim, so a padded value is a real filter to it. If only
    // one consumer trimmed, `?userId=+` would render an empty table while the
    // export downloaded every withdrawal in the system.
    const url = new URL('https://argon.example.com/withdrawals?userId=+++u-1+++&completerId=+&min=++');

    expect(withdrawalFiltersFromUrl(url)).toMatchObject({ UserId: 'u-1', CompleterId: '', Min: '' });
    // A whitespace-only filter collapses to "absent" for both consumers: the
    // export omits it, and the loader's `.length == 0` check sends undefined.
    expect(buildExportQuery(withdrawalFiltersFromUrl(url))).toBe('UserId=u-1');
  });

  it('yields empty strings for absent params rather than dropping keys', () => {
    const filters = withdrawalFiltersFromUrl(new URL('https://argon.example.com/withdrawals'));

    expect(Object.keys(filters).sort()).toEqual(
      ['After', 'Before', 'CompleterId', 'Id', 'Max', 'Min', 'Status', 'UserId'].sort(),
    );
    expect(Object.values(filters).every(v => v === '')).toBe(true);
    // An all-empty filter set must produce an unfiltered export, not a
    // request that filters on empty strings.
    expect(buildExportQuery(filters)).toBe('');
  });
});

const messages: WithdrawalExportMessages = {
  forbidden: 'forbidden copy',
  unavailable: 'unavailable copy',
  failed: 'failed copy',
};

describe('buildExportQuery', () => {
  it('passes all eight supported filters in the zinc casing and stable order', () => {
    expect(
      buildExportQuery({
        Id: 'w-1',
        UserId: 'user 1',
        CompleterId: 'c-1',
        Min: '10.50',
        Max: '20',
        Status: 'Pending',
        Before: '31-12-2026',
        After: '01-01-2026',
      }),
    ).toBe('Id=w-1&UserId=user+1&CompleterId=c-1&Min=10.5&Max=20&Status=Pending&Before=31-12-2026&After=01-01-2026');
  });

  it('omits empty, whitespace-only, Limit, and Skip values', () => {
    const filters: WithdrawalExportFilters & { Limit: string; Skip: string } = {
      Id: '',
      UserId: '   ',
      CompleterId: undefined,
      Min: '',
      Max: '',
      Status: 'Completed',
      Before: ' ',
      After: undefined,
      Limit: '100',
      Skip: '0',
    };
    expect(buildExportQuery(filters)).toBe('Status=Completed');
  });

  it('forwards an unparseable Min/Max as NaN rather than dropping the bound', () => {
    // The list loader sends parseFloat(min) — i.e. NaN — so zinc rejects the
    // table request. Silently dropping the bound here would let the export
    // succeed UNFILTERED against a table that errored, handing someone a
    // wider ledger than the screen they exported it from.
    expect(buildExportQuery({ Min: 'not-a-number' })).toBe('Min=NaN');
    expect(buildExportQuery({ Max: 'also-bad' })).toBe('Max=NaN');
  });

  it('trims and URL-encodes values', () => {
    expect(buildExportQuery({ UserId: '  a b&c  ' })).toBe('UserId=a+b%26c');
  });
});

describe('buildExportUrl', () => {
  it('appends the export path to the base url and accepts a trailing slash', () => {
    expect(buildExportUrl('https://api.example.com', {})).toBe('https://api.example.com/api/v1.0/Withdrawal/export');
    expect(buildExportUrl('https://api.example.com/', {})).toBe('https://api.example.com/api/v1.0/Withdrawal/export');
  });

  it('appends the encoded query when filters are present', () => {
    expect(buildExportUrl('https://api.example.com', { UserId: 'u-1' })).toBe(
      'https://api.example.com/api/v1.0/Withdrawal/export?UserId=u-1',
    );
  });
});

describe('filenameFromContentDisposition', () => {
  it('returns null for a missing header', () => {
    expect(filenameFromContentDisposition(null)).toBeNull();
    expect(filenameFromContentDisposition(undefined)).toBeNull();
  });

  it('reads quoted and bare filenames', () => {
    expect(filenameFromContentDisposition('attachment; filename="withdrawals-2026.csv"')).toBe('withdrawals-2026.csv');
    expect(filenameFromContentDisposition('attachment; filename=withdrawals.csv')).toBe('withdrawals.csv');
  });

  it('prefers a decodable RFC 5987 filename over the plain fallback', () => {
    expect(
      filenameFromContentDisposition(
        `attachment; filename="fallback.csv"; filename*=UTF-8''withdrawals%20%E2%82%AC.csv`,
      ),
    ).toBe('withdrawals €.csv');
  });

  it('falls back to a quoted name when the extended form is unusable', () => {
    expect(filenameFromContentDisposition(`attachment; filename="ok.csv"; filename*=UTF-8''`)).toBe('ok.csv');
  });

  it('accepts an RFC 5987 language tag and a non-UTF-8 charset', () => {
    // The language tag is optional but legal; a parser that only matched the
    // empty-language UTF-8 form would drop the server-chosen name entirely
    // when the header carries no plain `filename=` alongside it.
    expect(filenameFromContentDisposition(`attachment; filename*=UTF-8'en'withdrawals-2026.csv`)).toBe(
      'withdrawals-2026.csv',
    );
    expect(filenameFromContentDisposition(`attachment; filename*=ISO-8859-1''ledger.csv`)).toBe('ledger.csv');
  });

  it('keeps the raw value when the extended form has a malformed escape', () => {
    // decodeURIComponent throws on a truncated percent-escape; the name is
    // still better than nothing once sanitised.
    expect(filenameFromContentDisposition(`attachment; filename*=UTF-8''ledger%E0%A4.csv`)).toBe('ledger%E0%A4.csv');
  });

  it('sanitises path separators and control characters', () => {
    expect(filenameFromContentDisposition('attachment; filename="../../etc/passwd"')).toBe('.._.._etc_passwd');
    expect(filenameFromContentDisposition('attachment; filename="a\u0000\u001Fb.csv"')).toBe('ab.csv');
  });

  it('returns null when a quoted filename sanitises away rather than treating it as bare', () => {
    expect(filenameFromContentDisposition('attachment; filename=""')).toBeNull();
    expect(filenameFromContentDisposition('attachment; filename=".."')).toBeNull();
    expect(filenameFromContentDisposition('attachment')).toBeNull();
  });
});

describe('fallbackExportFilename', () => {
  it('uses both date bounds, either bound, or all', () => {
    expect(fallbackExportFilename('01-01-2026', '31-12-2026')).toBe('withdrawals-01-01-2026_31-12-2026.csv');
    expect(fallbackExportFilename('01-01-2026', '')).toBe('withdrawals-01-01-2026_all.csv');
    expect(fallbackExportFilename('', '31-12-2026')).toBe('withdrawals-all_31-12-2026.csv');
    expect(fallbackExportFilename()).toBe('withdrawals-all.csv');
  });

  it('sanitises date bounds taken straight from the url', () => {
    // This is the branch that actually runs cross-origin, so a hand-edited
    // `?after=` must not reach the anchor's download attribute unfiltered.
    expect(fallbackExportFilename('../../etc/passwd', '')).toBe('withdrawals-.._.._etc_passwd_all.csv');
    expect(fallbackExportFilename('a\u0000b', '')).toBe('withdrawals-ab_all.csv');
  });
});

describe('requestWithdrawalExport', () => {
  it('sends the exact URL and authenticated CSV headers, then downloads the response blob with its header filename', async () => {
    const fetch = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(new Blob(['id,status\nw-1,Pending\n']), {
          headers: { 'Content-Disposition': 'attachment; filename="ledger.csv"' },
        }),
    );
    const download = vi.fn();

    const result = await requestWithdrawalExport({
      baseUrl: 'https://api.example.com/',
      filters: {
        Id: 'w-1',
        UserId: 'u-1',
        CompleterId: 'c-1',
        Min: '10',
        Max: '20',
        Status: 'Pending',
        Before: '31-12-2026',
        After: '01-01-2026',
      },
      accessToken: 'access-token',
      messages,
      fetch,
      download,
    });

    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/api/v1.0/Withdrawal/export?Id=w-1&UserId=u-1&CompleterId=c-1&Min=10&Max=20&Status=Pending&Before=31-12-2026&After=01-01-2026',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer access-token',
          Accept: 'text/csv, application/problem+json, application/json',
        },
      },
    );
    expect(download).toHaveBeenCalledTimes(1);
    expect(download.mock.calls[0][1]).toBe('ledger.csv');
    expect(await (download.mock.calls[0][0] as Blob).text()).toBe('id,status\nw-1,Pending\n');
  });

  it('uses the date-based fallback when Content-Disposition is unavailable', async () => {
    const download = vi.fn();
    const result = await requestWithdrawalExport({
      baseUrl: 'https://api.example.com',
      filters: { After: '01-01-2026', Before: '31-12-2026' },
      accessToken: 'access-token',
      messages,
      fetch: async () => new Response(new Blob(['csv'])),
      download,
    });

    expect(result).toEqual({ ok: true });
    expect(download).toHaveBeenCalledWith(expect.any(Blob), 'withdrawals-01-01-2026_31-12-2026.csv');
  });

  it('asks for re-authentication on 401 instead of showing a dead toast', async () => {
    // The client-side expiry check passed, so the token looked live; only the
    // server knows it was revoked/rotated or that the clocks disagree. A
    // message here would strand the admin on a button that never works.
    const download = vi.fn();
    const result = await requestWithdrawalExport({
      baseUrl: 'https://api.example.com',
      filters: {},
      accessToken: 'stale-token',
      messages,
      fetch: async () => new Response(null, { status: 401 }),
      download,
    });

    expect(result).toEqual({ ok: false, reauth: true });
    expect(download).not.toHaveBeenCalled();
  });

  it('returns a readable failure without downloading an unsuccessful response', async () => {
    const download = vi.fn();
    const result = await requestWithdrawalExport({
      baseUrl: 'https://api.example.com',
      filters: {},
      accessToken: 'access-token',
      messages,
      fetch: async () => new Response(null, { status: 404 }),
      download,
    });

    expect(result).toEqual({ ok: false, message: 'unavailable copy' });
    expect(download).not.toHaveBeenCalled();
  });
});

describe('exportErrorMessage', () => {
  it('uses dedicated localized messages for 403 and 404', async () => {
    await expect(exportErrorMessage(new Response(null, { status: 403 }), messages)).resolves.toBe('forbidden copy');
    await expect(exportErrorMessage(new Response(null, { status: 404 }), messages)).resolves.toBe('unavailable copy');
  });

  it('surfaces a ProblemDetails detail and otherwise uses generic localized copy', async () => {
    await expect(
      exportErrorMessage(
        new Response(JSON.stringify({ status: 500, title: 'Server error', type: 'about:blank', detail: 'Try later' })),
        messages,
      ),
    ).resolves.toBe('Try later');
    await expect(exportErrorMessage(new Response('not JSON', { status: 500 }), messages)).resolves.toBe('failed copy');
  });

  it('falls back to generic copy for JSON that is not usable ProblemDetails', async () => {
    // Well-formed JSON that is not a problem document at all.
    await expect(
      exportErrorMessage(new Response(JSON.stringify({ oops: true }), { status: 500 }), messages),
    ).resolves.toBe('failed copy');
    // A real problem document whose detail is empty carries no message worth
    // showing, so the localized generic wins.
    await expect(
      exportErrorMessage(
        new Response(JSON.stringify({ status: 500, title: 'Server error', type: 'about:blank', detail: '' })),
        messages,
      ),
    ).resolves.toBe('failed copy');
  });
});

describe('triggerBlobDownload', () => {
  it('uses a synthetic anchor and revokes the object URL after a non-zero delay', () => {
    const anchor = { href: '', download: '', rel: '', click: vi.fn(), remove: vi.fn() };
    const revokeObjectURL = vi.fn();
    const append = vi.fn();
    const defer = vi.fn();
    let deferred: (() => void) | undefined;
    defer.mockImplementation((callback: () => void) => {
      deferred = callback;
    });

    triggerBlobDownload(new Blob(['csv']), 'ledger.csv', {
      createObjectURL: () => 'blob:withdrawals',
      revokeObjectURL,
      createAnchor: () => anchor,
      append,
      defer,
    });

    expect(anchor).toMatchObject({ href: 'blob:withdrawals', download: 'ledger.csv', rel: 'noopener' });
    expect(defer).toHaveBeenCalledWith(expect.any(Function), OBJECT_URL_REVOKE_DELAY_MS);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    deferred?.();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:withdrawals');
  });

  // The cleanup guarantees are the whole reason the browser calls are
  // injected: a leaked object URL pins the CSV in memory for the tab's
  // lifetime, and a stray anchor left in the body is a visible artefact.
  it('still removes the anchor when the click throws', () => {
    const anchor = {
      href: '',
      download: '',
      rel: '',
      click: vi.fn(() => {
        throw new Error('blocked');
      }),
      remove: vi.fn(),
    };

    expect(() =>
      triggerBlobDownload(new Blob(['csv']), 'ledger.csv', {
        createObjectURL: () => 'blob:withdrawals',
        revokeObjectURL: vi.fn(),
        createAnchor: () => anchor,
        append: vi.fn(),
        defer: vi.fn(),
      }),
    ).toThrow('blocked');

    expect(anchor.remove).toHaveBeenCalledOnce();
  });

  it('still schedules the object URL revoke when appending throws', () => {
    const revokeObjectURL = vi.fn();
    let deferred: (() => void) | undefined;

    expect(() =>
      triggerBlobDownload(new Blob(['csv']), 'ledger.csv', {
        createObjectURL: () => 'blob:withdrawals',
        revokeObjectURL,
        createAnchor: () => ({ href: '', download: '', rel: '', click: vi.fn(), remove: vi.fn() }),
        append: () => {
          throw new Error('detached');
        },
        defer: callback => {
          deferred = callback;
        },
      }),
    ).toThrow('detached');

    deferred?.();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:withdrawals');
  });
});
