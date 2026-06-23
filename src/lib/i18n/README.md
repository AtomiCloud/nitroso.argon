# i18n

Trilingual runtime for the app chrome, built on [`svelte-i18n`](https://github.com/kaisermann/svelte-i18n).

## Provenance

- **`locales/en.json`** is the **source of truth**. All keys originate here.
- **`locales/zh.json`** and **`locales/ms.json`** are an **unreviewed,
  machine-translated first pass**. They are provisional — treat copy as
  approximate until a human translator reviews it. Brand names (e.g.
  `common.appName`) are intentionally left untranslated.

All three catalogs MUST share exactly one key set. `scripts/i18n-check.mjs`
(`npm run i18n:check`) enforces this and fails CI on any drift.

> **Provisional translations.** `zh.json` and `ms.json` were produced as a
> machine-translated first pass during the full-app extraction (Plan 2) and are
> **not yet human-reviewed**. Treat them as approximate pending native-speaker
> review. `en.json` is the only authored copy.

## Namespaces

Copy is organised into per-domain namespaces. Current top-level namespaces:

- **Chrome / shared:** `common` (brand), `nav`, `account`, `theme`, `language`,
  `footer`, `loader`, `errorState`
- **Shared atoms (reused across features):** `actions` (save/cancel/…),
  `fields` (email/name/amount/…), `errors` (required/invalidNumber/…),
  `status` (booking / withdrawal / transaction-type / discount enum labels)
- **Customer areas:** `landing`, `legal.{terms,privacy,policy}`, `schedules`,
  `calendar`, `bookings.{list,detail,purchase,success}`, `bookingActions.*`,
  `passengers`, `wallets.*`, `transactions.*`, `withdrawals.*`, `profile`, `auth`
- **Admin areas:** `admin.users`, `admin.costs`, `discounts.*`

Reuse the shared `actions`/`fields`/`errors` atoms for plain common terms rather
than redefining them inside a feature namespace.

## Locale-aware formatting (FR12)

Dates, times, and money are rendered through stateless helpers in
[`format.ts`](./format.ts), re-exported from `$lib/i18n`:

```svelte
{formatMoney(amount, $lang)}        <!-- SGD by default, locale grouping -->
{formatDate(booking.date, $lang)}   <!-- calendar date -->
{formatDateTime(tx.createdAt, $lang)}
{formatTime(slot, $lang)}
{formatNumber(count, $lang)}
```

These take the active locale explicitly (`$lang`) and use `Intl` — they never
read the process-global `$locale`, so they are SSR-safe like everything else
here. Use them instead of ad-hoc `toFixed()` / `toLocaleString()` for any
user-facing money or date value.

## SSR-safety rule

The locale is **request-scoped**. Do NOT introduce process-global mutable
locale state on the server:

- Never call `locale.set()` on the server. The server render is driven by
  `event.locals.locale` (set in `src/hooks.server.ts`) → `$page.data.locale`.
- Always format with an explicit locale: `$_('nav.bookNow', { locale: $lang })`.
  `$lang` (from `$lib/i18n`) resolves to `$page.data.locale` on the server and
  to the picker's browser-only override on the client.
- `src/routes/+layout.ts` calls `waitLocale(...)` to warm the active catalog
  before first paint (no English flash). It never mutates the global locale on
  the server.

`setLocale()` (browser-only) is the single place that flips the active language:
it warms the target catalog, sets the persistence cookie, updates the override
store, syncs the svelte-i18n global, and updates `<html lang>`.

## How to add a key

1. Add the key (nested namespace, e.g. `account.profile`) to **`locales/en.json`**.
2. Add the **same** key to `locales/zh.json` and `locales/ms.json` with
   translations (machine translation is acceptable for the first pass).
3. Run `npm run i18n:check` to confirm the catalogs are in sync.
4. Reference it in markup: `{$_('account.profile', { locale: $lang })}`.
   For interpolation use `values`:
   `{$_('account.balance', { locale: $lang, values: { amount } })}`.
