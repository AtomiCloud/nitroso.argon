---
repo: argon
---
# Plan 1: Language switcher + i18n runtime (trilingual app shell)

## Overview
Stand up the complete i18n machinery and ship a **working, switchable trilingual app shell**.
This plan installs `svelte-i18n`, implements request-scoped locale negotiation, wires SSR so
the first paint is already in the right language, adds the in-app `LanguagePicker`, and extracts
the **global chrome** strings (header nav, account menu, common labels) into en/zh/ms catalogs so
there is real, switchable content to verify. It also adds the catalog-sync CI lint and the
unit + Playwright tests for resolution / auto-detect / switch / persist.

It is a self-contained vertical slice: after this commit the app genuinely detects, switches,
and persists language for the chrome — it builds, passes `i18n:check`, unit tests, and the
Playwright detect/switch/persist scenarios, and is independently revertable. It is NOT a
prep-only plan — it delivers visible, tested behavior. Plan 2 then extends translation coverage
to the rest of the app on top of this runtime.

## Changes
- **`package.json`** — add `svelte-i18n` to `dependencies`; add an `i18n:check` script
  (`node scripts/i18n-check.mjs`). Also append `&& npm run i18n:check` to the existing `check`
  script (currently `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`) for local
  convenience — but note this alone does **not** gate CI (see the pre-commit hook below).
- **`nix/pre-commit.nix`** — add a NEW dedicated hook so the catalog-sync check actually runs in
  CI. CI runs `scripts/ci/pre-commit.sh` → `SKIP=a-svelte-check pre-commit run --all`, i.e. it
  **skips the `a-svelte-check` hook** (the one that runs `bun run check`). So chaining into `check`
  gates local commits but NOT CI. Add an `a-i18n-check` hook (NOT named `a-svelte-check`, so it is
  not skipped) with `entry = "${packages.bun}/bin/bun run i18n:check"`, `language = "system"`,
  `pass_filenames = false` — this runs in both pre-commit and CI, satisfying FR11.

> **Runner note:** this repo's primary runner is **bun** (Taskfile + pre-commit use `bun run …`);
> `npm run X` and `bun run X` are equivalent for these scripts. Commands below are shown with
> `npm run` for brevity — the dev loop may use `bun run` to match repo convention.
- **`src/lib/i18n/resolve.ts`** (new) — pure, dependency-free locale negotiation:
  `negotiateLocale({ cookie, acceptLanguage })` returning a supported locale. Precedence:
  a valid supported cookie wins; else best-match of `Accept-Language` against the supported
  set; else `en`. A present-but-unsupported (tampered) cookie falls back to `en` and is NOT
  allowed to defer to `Accept-Language`. Export `SUPPORTED_LOCALES` (`en`,`zh`,`ms`) +
  `DEFAULT_LOCALE`.
- **`src/lib/i18n/resolve.test.ts`** (new) — `vitest` unit tests for every `resolve.ts` branch
  (cookie wins, Accept-Language best-match incl. `zh-CN`/`zh-Hans`→`zh` and quality values,
  no-match→`en`, tampered cookie→`en`).
- **`src/lib/i18n/index.ts`** (new) — register the three lazy-loaded catalogs with `svelte-i18n`
  (`register('en', () => import('./locales/en.json'))`, …), `init({ fallbackLocale: 'en' })`,
  and export a `lang` store = `$page.data.locale` on the server, with a client-only override the
  picker sets for instant switching. Never call `locale.set()` on the server.
- **`src/lib/i18n/locales/{en,zh,ms}.json`** (new) — seed with the **global chrome** namespaces
  only (`common`, `nav`, `account`). Actual locations of the chrome strings: `+layout.svelte`'s
  header holds `Book Now` (and the `BunnyBooker` brand); the bulk of the nav/account strings —
  `Costs`, `Discounts`, `Wallets`, `Users`, the `BALANCE: SGD {amount}` line, `Manage Bookings`,
  `Passengers`, `Withdrawals`, `Transactions`, `Profile`, `Log out`, `Sign in` — live in
  `src/lib/components/custom/account/account.svelte`; `Toggle theme` is in
  `src/lib/components/complex/LightSwitch.svelte`; plus the language-name label. `en` authored;
  `zh`/`ms` machine-translated. All three share one key set.
- **`src/lib/i18n/README.md`** (new) — provenance (en = source of truth; zh/ms = unreviewed
  machine-translated first pass), the SSR-safety rule (request-scoped, never `locale.set` on
  server, pass `{ locale: $lang }` per call), and "how to add a key".
- **`src/hooks.server.ts`** — currently exports `handle = SvelteKitAuth({...})` directly. Restructure
  to compose two handles: keep the auth handle (`const authHandle = SvelteKitAuth({...})`) and add a
  new `handleLocale` that reads the locale cookie + `Accept-Language`, calls `negotiateLocale`, stores
  the result on `event.locals.locale`, and rewrites the `%lang%` placeholder via
  `resolve(event, { transformPageChunk })`. Export
  `handle = sequence(handleLocale, authHandle)` using `sequence` from `@sveltejs/kit/hooks`.
- **`src/app.html`** — change `<html lang="en">` to `<html lang="%lang%">`.
- **`src/app.d.ts`** — declare `App.Locals.locale: string` and `App.PageData.locale: string`.
- **`src/routes/+layout.server.ts`** — return `locale: locals.locale` from `load` so it reaches
  `$page.data.locale` (added to every existing return path).
- **`src/routes/+layout.ts`** (new) — universal `load` that `await waitLocale(data.locale)` to
  warm the active catalog before first render (no flash); mirror the global on the client only.
- **`src/routes/+layout.svelte`** — import the i18n runtime; render header nav + the new
  `LanguagePicker`; replace hardcoded chrome strings with `{$_('nav.bookNow', { locale: $lang })}`
  etc.
- **`src/lib/components/custom/LanguagePicker.svelte`** (new) — a dropdown (reuse existing
  `bits-ui`/dropdown UI components) listing English / 中文 / Bahasa Melayu; on select, sets the
  locale cookie, updates the client override store for instant no-reload switch, and updates
  `<html lang>` on the client.
- **`src/lib/components/custom/account/account.svelte`** & **`src/lib/components/complex/LightSwitch.svelte`**
  — swap their hardcoded chrome strings to catalog keys.
- **`scripts/i18n-check.mjs`** (new) — load `en/zh/ms.json`, deep-flatten keys, and exit non-zero
  naming any key missing from or extra in a non-`en` catalog.
- **`tests/i18n.spec.ts`** (new) — Playwright covering: (a) auto-detect via `Accept-Language`
  header, (b) switch via the picker with no reload, (c) persistence across navigation/reload via
  cookie, (d) tampered cookie → English.
- **Remove/replace stale tests** — delete the empty `src/index.test.ts` placeholder, and replace
  the stale `tests/test.ts` (the default `'Welcome to SvelteKit'` Playwright test, which no longer
  matches any route and would fail the `playwright test` run) with the real i18n scenarios (or
  remove it in favor of `tests/i18n.spec.ts`).

## Spec Adherence
- **G1** → FR2 (three catalogs, one key set, zh/ms flagged provisional).
- **G2** → FR4 (auto-detect), FR5 (picker, instant no-reload — chrome), FR6 (cookie persistence,
  precedence over Accept-Language).
- **G3** → FR7 (no-flash SSR), FR8 (`<html lang>`, clean URLs — no path prefixes added), FR9
  (request-scoped, no cross-request bleed), FR10 (tampered/unsupported cookie → en).
- **G4** → FR11 (catalog-sync lint via a dedicated `a-i18n-check` pre-commit hook that runs in
  CI, plus chained into `check` locally), FR13 (unit + Playwright for resolve/detect/switch/persist).
- FR1/FR3/FR12 (full string extraction + locale date/number formatting) are delivered by Plan 2.

## Acceptance Criteria

### Functional Checks
- [ ] **AC1** — Locale negotiation obeys precedence (cookie > Accept-Language > en; tampered
  cookie → en).
  - **Evidence (type 1):** `npm run test:unit -- src/lib/i18n/resolve.test.ts` → vitest summary
    shows all resolve cases green.
- [ ] **AC2** — A fresh visitor with `Accept-Language: zh` sees the chrome in Chinese on first
  paint (SSR), with no English flash.
  - **Evidence (type 1):** `npm run test:integration -- tests/i18n.spec.ts` → the auto-detect +
    no-flash scenario passes (asserts server-rendered chrome text is Chinese before hydration).
- [ ] **AC3** — Selecting a language in the `LanguagePicker` updates all chrome copy immediately
  without a full page reload, and the choice persists across reload/navigation.
  - **Evidence (type 1):** same Playwright run → the switch (no-reload) and persist scenarios
    pass (assert no navigation occurs and the cookie is set + honored after reload).
- [ ] **AC4** — `<html lang>` reflects the active locale and no `/en`,`/zh` path prefix appears.
  - **Evidence (type 1):** Playwright asserts `document.documentElement.lang` per locale and that
    the URL path is unchanged after switching.

### Non-Functional Checks
- [ ] **NFC1** — The three catalogs stay in sync; the lint fails on drift and runs in CI (not
  only locally).
  - **Evidence (type 1):** `npm run i18n:check` → exit 0 on the seeded catalogs; (demonstrated in
    the dev loop) adding a stray key makes it exit non-zero naming the key. The `a-i18n-check`
    hook in `nix/pre-commit.nix` is not in CI's `SKIP=a-svelte-check` list, so it executes in the
    CI pre-commit run.
- [ ] **NFC2** — Type-check / build stays green with the new runtime.
  - **Evidence (type 1):** `npm run check` → 0 errors (now also runs `i18n:check`); `npm run build`
    succeeds.
- [ ] **NFC3** — No `locale.set()` is called on the server (SSR-safety).
  - **Evidence (type 2):** reviewer inspects `src/lib/i18n/index.ts`, `src/routes/+layout.ts`,
    `src/hooks.server.ts` — server path only warms `waitLocale`, never mutates the global locale.

## Validation Approach
- **Immediate automated:** vitest (resolve), Playwright (detect/switch/persist/lang/no-prefix),
  `i18n:check`, `npm run check`, `npm run build` — all runnable in CI.
- **Manual immediate:** none required beyond the automated scenarios for the chrome slice.
- **Post-release:** none specific to this plan.
