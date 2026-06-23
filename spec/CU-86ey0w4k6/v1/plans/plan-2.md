---
repo: argon
---
# Plan 2: Translate the whole app (full string extraction + locale formatting)

## Overview
On top of Plan 1's runtime, make the **entire app** trilingual: sweep every route and component
for frontend-owned hardcoded English, move each string into the en/zh/ms catalogs under sensible
namespaces, render it through the i18n layer, and make user-facing dates/numbers locale-aware.
English is authored; Chinese and Malay are produced by the dev loop as a machine-translated first
pass, flagged provisional. This is the bulk extraction the ticket calls for (~300+ strings across
~155 components).

It is a self-contained vertical slice: the app already switches language (Plan 1); this commit
makes that switch apply to all copy app-wide. It builds, keeps `i18n:check` green (catalogs stay
in sync), and is verified by an extended Playwright pass plus a residual-hardcoded-string sweep.
It depends only on Plan 1 (the runtime), not on any later plan.

## Changes
- **`src/lib/i18n/locales/en.json`** — extend with all remaining user-facing copy, organised into
  per-domain namespaces (e.g. `landing`, `auth`, `legal`, `schedules`, `bookings`, `passengers`,
  `wallets`, `transactions`, `withdrawals`, `profile`, `admin.costs`, `admin.discounts`,
  `admin.users`, plus shared `actions`/`fields`/`errors`). Dynamic values use structured
  interpolation (`{ values: { amount } }`), never English-shaped concatenation.
- **`src/lib/i18n/locales/{zh,ms}.json`** — mirror the full key set with machine translations
  (LLM-produced first pass), flagged provisional per the README; identical key set to `en`.
- **`src/routes/**/*.svelte`** — replace hardcoded copy with `{$_('ns.key', { locale: $lang })}`
  across all customer + admin pages: `/` (landing), `/register`, `/policy` `/privacy` `/terms`
  (legal), `/schedules`, `/bookings` `/bookings/[booking_id]` `/bookings/purchase(/success)`,
  `/passengers`, `/wallets/*`, `/transactions/*`, `/withdrawals/*`, `/profile`, `/costs`,
  `/discounts`, `/users` `/users/[user_id]`.
- **`src/lib/components/**/*.svelte`** — replace hardcoded copy in domain/custom components
  (cards, tables, dialogs, forms). Toast messages (via `svelte-sonner`) and `aria-label`s are
  sourced from catalogs too. shadcn-style primitives under `src/lib/components/ui/**` that carry
  no product copy are left as-is.
- **Form/validation + load-error copy** — user-facing strings emitted from `+page.ts`/`+page.server.ts`
  loaders, `sveltekit-superforms` messages, and component error states are localized; backend/API
  (RFC7807 `problem_details`) error strings stay English.
- **Locale-aware formatting** — introduce small locale-aware date/number helpers (reuse
  `date-fns` locales / `@internationalized/date` / `Intl.NumberFormat`) and apply them to the
  FR12 values: booking dates/times, costs/prices, wallet balances, and transaction amounts/dates.
- **`tests/i18n.spec.ts`** (extend) — add per-area spot-checks: load representative customer +
  admin pages under `zh` and `ms` and assert key copy is translated (not English) and that a
  formatted date/amount renders in locale form.
- **`src/lib/i18n/README.md`** — update the namespace list if it enumerates namespaces.

## Spec Adherence
- **G1** → FR1 (all frontend-owned copy incl. toasts, aria-labels, primary title/meta; full SEO
  sweep out of scope), FR3 (structured interpolation; API errors stay English).
- **G4** → FR12 (locale-aware dates/numbers for the named values).
- Relies on Plan 1 for FR2/FR4–FR11/FR13 (the runtime, catalogs scaffold, lint, base tests).
- Across Plans 1+2, every spec FR is covered.

## Acceptance Criteria

### Functional Checks
- [ ] **AC1** — Customer pages render translated copy under non-English locales (no leftover
  English in extracted areas).
  - **Evidence (type 1):** `npm run test:integration -- tests/i18n.spec.ts` → the customer-area
    zh/ms spot-check scenarios pass (assert specific translated strings present, English absent).
- [ ] **AC2** — Admin pages (`/costs`, `/discounts`, `/users`) render translated copy under
  non-English locales.
  - **Evidence (type 1):** same Playwright run → the admin-area zh/ms spot-check scenario passes.
- [ ] **AC3** — User-facing dates and monetary/numeric values render in locale-appropriate form
  (booking dates, costs, wallet balance, transaction amounts/dates).
  - **Evidence (type 1):** Playwright asserts a known booking date and a money amount render in
    the expected locale format under `zh`/`ms` vs `en`.
- [ ] **AC4** — Interpolated strings (e.g. balance with an amount) read naturally per language,
  driven by `{ values }` not concatenation.
  - **Evidence (type 2):** reviewer inspects the catalog entries + call sites for interpolated
    keys — placeholders are positioned per-language, no string concatenation of fragments.

### Non-Functional Checks
- [ ] **NFC1** — All three catalogs remain in sync after the full extraction.
  - **Evidence (type 1):** `npm run i18n:check` → exit 0 (en/zh/ms share one key set).
- [ ] **NFC2** — Type-check and build stay green after the sweep.
  - **Evidence (type 1):** `npm run check` → 0 errors; `npm run build` succeeds.
- [ ] **NFC3** — No significant residual hardcoded user-facing copy remains in extracted areas.
  - **Evidence (type 1):** a sweep command (e.g. a grep/script over `src/routes` + custom
    components for non-trivial hardcoded text outside `$_(...)`) → output reviewed, only
    intentional exclusions (UI primitives, API-error passthrough) remain.
- [ ] **NFC4** — zh/ms catalogs are clearly flagged as provisional machine translation.
  - **Evidence (type 2):** reviewer inspects `src/lib/i18n/README.md` provenance note (carried
    from Plan 1) and confirms it still describes zh/ms as unreviewed.

## Validation Approach
- **Immediate automated:** extended Playwright zh/ms spot-checks (customer + admin + formatting),
  `i18n:check`, `npm run check`, `npm run build`, and a residual-hardcoded-string sweep — all in CI.
- **Manual immediate:** spot-check a few high-traffic pages in zh + ms for layout breakage from
  longer strings (egregious breakage is in-scope to fix; cosmetic polish is follow-up).
- **Post-release (manual):** native-speaker review of the zh + ms catalogs — flagged follow-up,
  not a blocker for this ticket.
