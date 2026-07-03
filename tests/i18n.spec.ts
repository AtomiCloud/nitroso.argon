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

// Plan 2 — full-app extraction. Spot-check that representative customer and
// admin pages render translated copy (and NOT the English source) under zh/ms.
// We inspect the raw SSR HTML (cookie-driven locale), so the checks are
// hermetic: they assert the i18n layer renders translated copy server-side and
// do not depend on any backend data being present.
const PAGE_CASES = [
  // Customer-facing pages (AC1)
  {
    path: '/',
    label: 'customer/landing',
    en: 'Why Choose BunnyBooker?',
    zh: '为什么选择 BunnyBooker？',
    ms: 'Mengapa Pilih BunnyBooker?',
  },
  {
    path: '/terms',
    label: 'customer/legal-terms',
    en: 'Terms and Condition',
    zh: '条款与条件',
    ms: 'Terma dan Syarat',
  },
  {
    path: '/privacy',
    label: 'customer/legal-privacy',
    en: 'Privacy Policy',
    zh: '隐私政策',
    ms: 'Dasar Privasi',
  },
  // Admin pages (AC2)
  {
    path: '/users',
    label: 'admin/users',
    en: 'Search by Username',
    zh: '按用户名搜索',
    ms: 'Cari mengikut Nama Pengguna',
  },
  {
    path: '/discounts',
    label: 'admin/discounts',
    en: 'Discount Type',
    zh: '折扣类型',
    ms: 'Jenis Diskaun',
  },
] as const;

async function ssrHtml(browser: import('@playwright/test').Browser, path: string, locale: string): Promise<string> {
  const context = await browser.newContext();
  await context.addCookies([{ name: 'locale', value: locale, url: 'http://localhost:4173' }]);
  const page = await context.newPage();
  const html = await (await page.request.get(path)).text();
  await context.close();
  return html;
}

test.describe('i18n — full-app extraction (Plan 2): customer + admin pages', () => {
  for (const c of PAGE_CASES) {
    for (const locale of ['zh', 'ms'] as const) {
      test(`${c.label} renders ${locale} copy with no English leftover`, async ({ browser }) => {
        const html = await ssrHtml(browser, c.path, locale);
        expect(html).toContain(`<html lang="${locale}">`);
        // Translated copy is present...
        expect(html).toContain(c[locale]);
        // ...and the English source string is absent from the extracted area.
        expect(html).not.toContain(c.en);
      });
    }

    test(`${c.label} still renders the English source under en`, async ({ browser }) => {
      const html = await ssrHtml(browser, c.path, 'en');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain(c.en);
    });
  }
});

// AC3 — locale-aware formatting (FR12). The landing page renders customer
// review timestamps (fixed past dates baked into the page) through the
// locale-aware relative-date helper, so the SAME instant renders in a
// language-appropriate form server-side, with NO backend data required. We
// assert on the addSuffix marker each language emits for any past date
// ("ago" / "前" / "lalu"), which is intrinsic to the language and therefore
// stable over time.
const RELATIVE_DATE_MARKER = {
  en: 'ago',
  zh: '前', // Chinese "ago" suffix
  ms: 'lalu', // Malay "ago" (… yang lalu)
} as const;

test.describe('i18n — locale-aware date formatting (AC3 / FR12)', () => {
  for (const locale of ['en', 'zh', 'ms'] as const) {
    test(`landing review dates render in ${locale} relative-date form`, async ({ browser }) => {
      const html = await ssrHtml(browser, '/', locale);
      expect(html).toContain(`<html lang="${locale}">`);
      // The relative date renders with this locale's "ago" marker...
      expect(html).toContain(RELATIVE_DATE_MARKER[locale]);
    });
  }

  // The same fixed dates must NOT leak the English marker under zh/ms — proof
  // the date itself is formatted per-locale, not left in English.
  for (const locale of ['zh', 'ms'] as const) {
    test(`landing review dates show no English "ago" under ${locale}`, async ({ browser }) => {
      const html = await ssrHtml(browser, '/', locale);
      expect(html).not.toContain(' ago');
    });
  }
});

// AC3 — rendered-page proof for a KNOWN booking date AND a money amount in
// locale-appropriate form, exercising the real `formatCalendarDate` and
// `formatMoney` call sites on a real page.
//
// `/bookings` seeds its date-filter from the `?date=` query param (a floating
// "dd-MM-yyyy" calendar day) and renders it through `formatCalendarDate` in the
// picker button — entirely server-side, with NO backend data required, so it is
// hermetic. The same page also renders the wallet balance through `formatMoney`
// (`$page.data.user?.wallet?.usable ?? 0`); with no authenticated session the
// balance falls back to 0 and renders server-side as a known money amount, so
// we assert BOTH a known booking date and a known money amount on one rendered
// page, exactly as AC3 specifies.
//
// The booking *time* (a backend "HH:mm:ss" slot) and non-zero money amounts
// require backend data, so they cannot be server-rendered in this hermetic
// suite; their locale formatting + the booking-time TZ fix are proven at the
// call-site/helper level in src/lib/i18n/format.test.ts (see
// addressed-reviews.md for the rationale).
const BOOKING_DATE_CASE = {
  // "15-01-2024" -> dateStyle:"long" per locale (Intl/ICU; see format.test.ts).
  en: '15 January 2024',
  zh: '2024年1月15日',
  ms: '15 Januari 2024',
} as const;

// `formatMoney(0, locale)` for SGD (the wallet balance with no session). en/zh
// (en-SG / zh-SG) render the "$" glyph; ms (ms-MY) renders the "SGD" ISO code —
// the locale-appropriate distinction proven on a rendered page (richer grouping
// and per-locale glyphs for non-zero amounts are proven in format.test.ts).
const BALANCE_CASE = {
  en: /\$0\.00/,
  zh: /\$0\.00/,
  // ms-MY renders the ISO code separated by a NON-BREAKING space (U+00A0), which
  // is exactly what `Intl.NumberFormat` emits and what SvelteKit SSRs verbatim.
  ms: /SGD\s0\.00/,
} as const;

test.describe('i18n — known booking date + money amount on a rendered page (AC3 / FR12)', () => {
  const path = '/bookings?date=15-01-2024&direction=JToW';

  for (const locale of ['zh', 'ms'] as const) {
    test(`booking date + balance render in ${locale} form, with no English month leftover`, async ({ browser }) => {
      const html = await ssrHtml(browser, path, locale);
      expect(html).toContain(`<html lang="${locale}">`);
      // The known booking date renders in this locale's calendar form...
      expect(html).toContain(BOOKING_DATE_CASE[locale]);
      // ...and the English long month name is absent (proof it is localized).
      expect(html).not.toContain('January');
      // ...and the wallet balance renders as a locale-appropriate money amount.
      expect(html).toMatch(BALANCE_CASE[locale]);
    });
  }

  test('the Malay balance uses the SGD ISO code, not the English "$" glyph', async ({ browser }) => {
    // ms vs en discriminator on a rendered page: ms shows "SGD 0.00" and must
    // not fall back to the en "$0.00" form — proof the money is locale-aware.
    const html = await ssrHtml(browser, path, 'ms');
    expect(html).toMatch(BALANCE_CASE.ms);
    expect(html).not.toContain('$0.00');
  });

  test('booking date + balance render the English form under en', async ({ browser }) => {
    const html = await ssrHtml(browser, path, 'en');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain(BOOKING_DATE_CASE.en);
    expect(html).toMatch(BALANCE_CASE.en);
  });
});

// Open a real page in the browser with the locale cookie pre-set, so the
// component runs (hydrates) and the dropdown trigger / dialog toggles render
// exactly what a user in that locale sees.
async function gotoWithLocale(
  browser: import('@playwright/test').Browser,
  path: string,
  locale: string,
): Promise<{ page: import('@playwright/test').Page; context: import('@playwright/test').BrowserContext }> {
  const context = await browser.newContext();
  await context.addCookies([{ name: 'locale', value: locale, url: 'http://localhost:4173' }]);
  const page = await context.newPage();
  await page.goto(path);
  return { page, context };
}

// HIGH #2 — a deep-linked filter value (e.g. `?status=Completed`) must render
// its TRANSLATED label in the closed Select trigger, not the English constant.
// The Select menu (`Select.Content`) only mounts while open, so the closed
// trigger (`role="combobox"`) is the only place the selected label appears —
// making this an unambiguous check on the selected-label path Reviewer flagged.
const BOOKING_STATUS_LABEL = { en: 'Completed', zh: '已完成', ms: 'Selesai' } as const;

test.describe('i18n — selected filter labels localized on deep links (AC2 / NFC3)', () => {
  for (const locale of ['zh', 'ms'] as const) {
    test(`/bookings?status=Completed shows the ${locale} selected label, not English`, async ({ browser }) => {
      const { page, context } = await gotoWithLocale(browser, '/bookings?status=Completed&direction=JToW', locale);
      const trigger = page.locator('[role="combobox"]').first();
      await expect(trigger).toContainText(BOOKING_STATUS_LABEL[locale]);
      await expect(trigger).not.toContainText(BOOKING_STATUS_LABEL.en);
      await context.close();
    });
  }

  test('/bookings?status=Completed shows the English selected label under en', async ({ browser }) => {
    const { page, context } = await gotoWithLocale(browser, '/bookings?status=Completed&direction=JToW', 'en');
    await expect(page.locator('[role="combobox"]').first()).toContainText(BOOKING_STATUS_LABEL.en);
    await context.close();
  });

  const DT_LABEL = { en: 'Percentage', zh: '百分比', ms: 'Peratusan' } as const;
  for (const locale of ['zh', 'ms'] as const) {
    test(`/discounts?discountType=Percentage shows the ${locale} selected label, not English`, async ({ browser }) => {
      const { page, context } = await gotoWithLocale(browser, '/discounts?discountType=Percentage', locale);
      // The discounts admin page sets the global `problem` store and hides its
      // content div (`+layout.svelte`: `{$showContent ? '' : 'hidden'}`) when
      // the data load has no backend (hermetic suite), so we assert on the
      // trigger's text content — `toContainText` reads textContent regardless of
      // visibility and excludes the form `value="Percentage"` attribute, so it
      // isolates the *rendered label*. Only the discountType trigger carries a
      // deep-linked value; the other two show their placeholder.
      const triggers = page.locator('[role="combobox"]');
      await expect(triggers.filter({ hasText: DT_LABEL[locale] })).toHaveCount(1);
      await expect(triggers.filter({ hasText: DT_LABEL.en })).toHaveCount(0);
      await context.close();
    });
  }

  test('/discounts?discountType=Percentage shows the English selected label under en', async ({ browser }) => {
    const { page, context } = await gotoWithLocale(browser, '/discounts?discountType=Percentage', 'en');
    await expect(page.locator('[role="combobox"]').filter({ hasText: DT_LABEL.en })).toHaveCount(1);
    await context.close();
  });
});

// HIGH #1 — the discount create/update dialogs render their enum toggles via
// the catalog (status.discountType.* / status.discountMode.* /
// status.discountMatchType.*), not the English `Selected.label` constant.
//
// The dialog content (`Dialog.Content`) only mounts once the trigger is
// clicked, and the trigger lives inside the page's content div, which the
// layout hides whenever the data load fails (no backend in the hermetic
// suite) — so the dialog cannot be opened here to inspect its toggles. We
// instead assert, on the server-rendered admin page, that the dialog's
// entry point is localized (the `Create Discount` trigger), and prove the
// toggle wiring itself with a source-level grep assertion captured in
// evidence (`reviewer-fixes-assert.log`) plus the Type-2 diff review in
// self-review.md. The trigger text is present in the SSR HTML even while the
// content div is `display:none`, since that does not strip text from markup.
const CREATE_DISCOUNT_TRIGGER = { en: 'Create Discount', zh: '创建折扣', ms: 'Cipta Diskaun' } as const;
test.describe('i18n — discount create-dialog entry localized (AC2 / NFC3)', () => {
  for (const locale of ['zh', 'ms'] as const) {
    test(`/discounts renders the localized create-dialog trigger under ${locale}`, async ({ browser }) => {
      const html = await ssrHtml(browser, '/discounts', locale);
      expect(html).toContain(CREATE_DISCOUNT_TRIGGER[locale]);
      expect(html).not.toContain(CREATE_DISCOUNT_TRIGGER.en);
    });
  }

  test('/discounts renders the English create-dialog trigger under en', async ({ browser }) => {
    const html = await ssrHtml(browser, '/discounts', 'en');
    expect(html).toContain(CREATE_DISCOUNT_TRIGGER.en);
  });
});

// FR3 / Reviewer-1 HIGH — frontend-owned load-error copy emitted by `+page.ts`
// loaders (the local fallback passed to `toResult(...)`) is localized, while
// backend/API RFC7807 problem strings stay English.
//
// These fallbacks surface as `prob.detail` in `error.svelte` only when the
// loader's local request wrapper throws a NON-HTTP exception (e.g. the backend
// is unreachable). The hermetic suite has no backend, so the server-side fetch
// throws → `toResult` takes the `LocalExceptionError` branch → `prob.detail` is
// the loader's localized fallback. The `problem` store is set on hydration (not
// during the raw SSR pass, which still renders page content), so we drive a
// REAL page load (`gotoWithLocale`) and assert on the rendered error detail.
//
// `prob.title` ("Client Error") is the generic problem-TYPE label from the
// error registry (`error_info.ts`), the RFC7807 `title` taxonomy field shared
// with backend errors — intentionally left English, like the backend problem
// strings the spec keeps English. The user-facing message we localize is the
// per-loader `detail`.
const LOAD_ERROR_CASES = [
  // path, plus the localized `errors.load.*` detail rendered per locale.
  {
    path: '/bookings',
    label: 'customer/bookings',
    en: 'Fail to get bookings',
    zh: '获取预订失败',
    ms: 'Gagal mendapatkan tempahan',
  },
  {
    path: '/discounts',
    label: 'admin/discounts',
    en: 'Fail to get discounts',
    zh: '获取折扣失败',
    ms: 'Gagal mendapatkan diskaun',
  },
  {
    path: '/users',
    label: 'admin/users',
    en: 'Fail to get users',
    zh: '获取用户失败',
    ms: 'Gagal mendapatkan pengguna',
  },
] as const;

test.describe('i18n — localized load-error fallback (FR3 / NFC3)', () => {
  for (const c of LOAD_ERROR_CASES) {
    for (const locale of ['zh', 'ms'] as const) {
      test(`${c.label} load-error detail renders ${locale}, not English`, async ({ browser }) => {
        const { page, context } = await gotoWithLocale(browser, c.path, locale);
        // The error surface renders the loader fallback in the active locale...
        await expect(page.locator('body')).toContainText(c[locale]);
        // ...and the English source string is absent.
        await expect(page.locator('body')).not.toContainText(c.en);
        await context.close();
      });
    }

    test(`${c.label} load-error detail renders the English source under en`, async ({ browser }) => {
      const { page, context } = await gotoWithLocale(browser, c.path, 'en');
      await expect(page.locator('body')).toContainText(c.en);
      await context.close();
    });
  }
});

// AC5 / NFC3 — wallet FORM-VALIDATION errors render in the active locale, not
// English. `Validation.svelte` prints `error.message` straight to the UI, so the
// Zod schema messages must come from the catalog (`validation.*`). The deposit
// page (`/wallets/deposit`) is the user-reachable path: it has no `+page.ts`
// loader and the layout does not redirect an unauthenticated visitor, so the form
// renders and validates client-side with no backend. We type a too-low amount to
// trip the `gte(5)` rule and assert the rendered message is localized. (The
// admin transfer/promo forms share the same mechanism via
// `makeTransferSchema` but live behind authenticated backend data, so their
// localization is proven in src/lib/components/entities/Wallets/transfer.test.ts.)
const DEPOSIT_MIN_ERROR = {
  en: 'Top up amount must be greater than 5',
  zh: '充值金额必须大于 5',
  ms: 'Jumlah tambah nilai mestilah lebih daripada 5',
} as const;

test.describe('i18n — wallet deposit form-validation localized (AC5 / NFC3)', () => {
  for (const locale of ['zh', 'ms'] as const) {
    test(`deposit amount-too-low error renders in ${locale}, not English`, async ({ browser }) => {
      const { page, context } = await gotoWithLocale(browser, '/wallets/deposit', locale);
      // Typing a value below the minimum trips the localized `gte(5)` message.
      await page.getByPlaceholder('0.00').fill('2');
      // The validation error renders in the active locale...
      await expect(page.locator('body')).toContainText(DEPOSIT_MIN_ERROR[locale]);
      // ...and the English source literal is absent.
      await expect(page.locator('body')).not.toContainText(DEPOSIT_MIN_ERROR.en);
      await context.close();
    });
  }

  test('deposit amount-too-low error renders the English source under en', async ({ browser }) => {
    const { page, context } = await gotoWithLocale(browser, '/wallets/deposit', 'en');
    await page.getByPlaceholder('0.00').fill('2');
    await expect(page.locator('body')).toContainText(DEPOSIT_MIN_ERROR.en);
    await context.close();
  });

  // The spec's stated intent is that the no-reload language switch applies to ALL
  // copy app-wide, "including form-validation errors". This exercises the
  // switch-WHILE-error-visible path: an English error is on screen, then the user
  // flips the picker to zh (then ms) without reloading. The stored ZodIssue
  // message must re-render in the new locale, not stay English. Regression guard
  // for the AC5 reactive-revalidation fix in the wallet forms.
  test('a visible deposit error re-renders after a no-reload language switch (AC5)', async ({ browser }) => {
    const { page, context } = await gotoWithLocale(browser, '/wallets/deposit', 'en');

    // Trigger the English validation error.
    await page.getByPlaceholder('0.00').fill('2');
    await expect(page.locator('body')).toContainText(DEPOSIT_MIN_ERROR.en);

    // Switch to Chinese via the picker, with the error still on screen and no reload.
    await page.getByTestId('language-picker').click();
    await page.getByTestId('locale-option-zh').click();

    // The already-rendered error follows the new locale; the English literal is gone.
    await expect(page.locator('body')).toContainText(DEPOSIT_MIN_ERROR.zh);
    await expect(page.locator('body')).not.toContainText(DEPOSIT_MIN_ERROR.en);

    // And again to Malay — still no reload.
    await page.getByTestId('language-picker').click();
    await page.getByTestId('locale-option-ms').click();
    await expect(page.locator('body')).toContainText(DEPOSIT_MIN_ERROR.ms);
    await expect(page.locator('body')).not.toContainText(DEPOSIT_MIN_ERROR.zh);

    await context.close();
  });
});
