import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/stores', async () => {
  const { readable } = await import('svelte/store');
  return {
    page: readable({
      data: { session: { roles: ['admin'] } },
      params: {},
      route: { id: '/stats' },
      status: 200,
      url: new URL('https://example.test/stats'),
    }),
    navigating: readable(null),
    updated: readable(false),
  };
});

import Page from './+page.svelte';

describe('stats page', () => {
  it('renders on the server before client-side data loads', () => {
    const rendered = (Page as unknown as { render: () => { html: string } }).render();
    expect(rendered.html).toContain('Booking Statistics');
  });
});
