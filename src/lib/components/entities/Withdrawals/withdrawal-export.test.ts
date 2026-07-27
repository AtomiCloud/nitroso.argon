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
  type WithdrawalExportFilters,
  type WithdrawalExportMessages,
} from './withdrawal-export';

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

  it('omits empty, whitespace-only, invalid numeric, Limit, and Skip values', () => {
    const filters: WithdrawalExportFilters & { Limit: string; Skip: string } = {
      Id: '',
      UserId: '   ',
      CompleterId: undefined,
      Min: 'not-a-number',
      Max: '',
      Status: 'Completed',
      Before: ' ',
      After: undefined,
      Limit: '100',
      Skip: '0',
    };
    expect(buildExportQuery(filters)).toBe('Status=Completed');
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
        headers: { Authorization: 'Bearer access-token', Accept: 'text/csv' },
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
    expect(append).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(defer).toHaveBeenCalledWith(expect.any(Function), OBJECT_URL_REVOKE_DELAY_MS);
    expect(OBJECT_URL_REVOKE_DELAY_MS).toBeGreaterThan(0);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    deferred?.();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:withdrawals');
  });
});
