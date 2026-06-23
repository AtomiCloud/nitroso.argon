import { test, expect } from '@playwright/test';

// Chrome strings used as language fingerprints (the "Sign in" account button is
// rendered server-side for an unauthenticated visitor in all three languages).
const SIGN_IN = {
  en: 'Sign in',
  zh: '登录',
  ms: 'Log masuk',
} as const;

test.describe('i18n — auto-detect (SSR, no flash)', () => {
  test('Accept-Language: zh renders Chinese chrome on first paint with no English flash', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.5' },
    });
    const page = await context.newPage();

    // Inspect the raw SSR HTML (pre-hydration) directly.
    const res = await page.request.get('/');
    const html = await res.text();

    expect(html).toContain('<html lang="zh">');
    expect(html).toContain(SIGN_IN.zh);
    // No English flash: the English chrome string must be absent from the
    // server-rendered markup.
    expect(html).not.toContain(SIGN_IN.en);

    await context.close();
  });

  test('Accept-Language: ms renders Malay chrome on first paint', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'ms-MY,ms;q=0.9' },
    });
    const page = await context.newPage();
    const html = await (await page.request.get('/')).text();

    expect(html).toContain('<html lang="ms">');
    expect(html).toContain(SIGN_IN.ms);
    expect(html).not.toContain(SIGN_IN.en);

    await context.close();
  });

  test('no Accept-Language match falls back to English', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'fr-FR,de-DE;q=0.8' },
    });
    const page = await context.newPage();
    const html = await (await page.request.get('/')).text();

    expect(html).toContain('<html lang="en">');
    expect(html).toContain(SIGN_IN.en);

    await context.close();
  });
});

test.describe('i18n — picker switch (instant, no reload) + persistence', () => {
  test('switching updates chrome instantly without a full reload, and persists', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(SIGN_IN.en, { exact: true })).toBeVisible();

    // Sentinel that a full page reload would wipe out.
    await page.evaluate(() => {
      (window as unknown as { __noReload?: boolean }).__noReload = true;
    });
    const pathBefore = new URL(page.url()).pathname;

    // Switch to Chinese via the picker.
    await page.getByTestId('language-picker').click();
    await page.getByTestId('locale-option-zh').click();

    // Chrome copy updates immediately to Chinese.
    await expect(page.getByText(SIGN_IN.zh, { exact: true })).toBeVisible();
    await expect(page.getByText(SIGN_IN.en, { exact: true })).toHaveCount(0);

    // No navigation occurred: sentinel survives and URL path is unchanged.
    const survived = await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload === true);
    expect(survived).toBe(true);
    expect(new URL(page.url()).pathname).toBe(pathBefore);

    // <html lang> reflects the active locale on the client.
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('zh');

    // Persistence: cookie is set...
    const cookies = await page.context().cookies();
    expect(cookies.find(c => c.name === 'locale')?.value).toBe('zh');

    // ...and honored after a full reload (SSR re-reads the cookie).
    await page.reload();
    const reloadHtmlLang = await page.evaluate(() => document.documentElement.lang);
    expect(reloadHtmlLang).toBe('zh');
    await expect(page.getByText(SIGN_IN.zh, { exact: true })).toBeVisible();

    // ...and across navigation to another route.
    await page.goto('/terms');
    await expect(page.getByText(SIGN_IN.zh, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('zh');
  });

  test('cookie takes precedence over Accept-Language and no /zh path prefix appears', async ({ browser }) => {
    // Browser asks for Malay, but a persisted cookie selects Chinese.
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'ms-MY,ms;q=0.9' },
    });
    await context.addCookies([{ name: 'locale', value: 'zh', url: 'http://localhost:4173' }]);
    const page = await context.newPage();
    await page.goto('/');

    await expect(page.getByText(SIGN_IN.zh, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('zh');
    // Clean URL: no language path prefix.
    expect(new URL(page.url()).pathname).toBe('/');

    await context.close();
  });
});

test.describe('i18n — tampered cookie', () => {
  test('an unsupported cookie value falls back to English (and does not defer to Accept-Language)', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'zh-CN,zh;q=0.9' },
    });
    await context.addCookies([{ name: 'locale', value: 'xx-tampered', url: 'http://localhost:4173' }]);
    const page = await context.newPage();
    const html = await (await page.request.get('/')).text();

    expect(html).toContain('<html lang="en">');
    expect(html).toContain(SIGN_IN.en);
    expect(html).not.toContain(SIGN_IN.zh);

    await context.close();
  });
});
