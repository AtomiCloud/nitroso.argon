---
repo: argon
---
# Plan 2: Translate the whole app (full string extraction + locale formatting)

> **AMENDED (refine_local after run b4d20rql hit max_iterations at avg 95%).** The full
> extraction is ALREADY ~95% done and uncommitted in this worktree (80 changed files; all
> standard gates green — build, typecheck, `i18n:check` 799×3, lint, 34 unit + 48 integration
> tests, verify-keys 825→0). Synthesis found **no spec-level conflict**. The loop exhausted its
> budget on ONE real residual gap (wallet form-validation copy) plus an evidence gap. **This is a
> VERIFY-AND-CLOSE pass, NOT a rebuild** — keep every green gate green and only do the work in
> "Refinement scope" below. See `plans/resolution.md` for the decision context.

## Overview
On top of Plan 1's runtime, make the **entire app** trilingual: every route and component's
frontend-owned hardcoded English is moved into the en/zh/ms catalogs and rendered through the
i18n layer, with user-facing dates/numbers locale-aware. English is authored; Chinese and Malay
are a machine-translated first pass, flagged provisional. The bulk is done; the remaining work is
to close the wallet form-validation localization gap and capture its evidence.

It is a self-contained vertical slice: the app already switches language (Plan 1); this commit
makes that switch apply to all copy app-wide, including form-validation errors. It builds, keeps
the catalog-sync check green, and is verified by the extended Playwright pass + a residual-string
sweep that now also covers script-level validation literals. Depends only on Plan 1.

## Refinement scope (the remaining gap — do THIS, don't redo the rest)
1. **Localize wallet form-validation messages (HIGH — the blocker).** `Validation.svelte`
   (`src/lib/components/core/Validation.svelte:20`) renders `error?.message` straight to the UI,
   so these literals show untranslated under zh/ms:
   - `src/routes/wallets/deposit/+page.svelte:34` — "Top up amount must be greater than 5"
   - `src/routes/wallets/deposit/+page.svelte:35` — "Top up amount be a finite number"
   - `src/routes/wallets/deposit/+page.svelte:40` — "Maximum precision of 2"
   - `src/lib/components/entities/Wallets/transfer.ts:4` — "Amount must be greater than 0" /
     "Amount must be a finite number"
   - `src/lib/components/entities/Wallets/transfer.ts:8,9` — description length errors
   These schemas feed `AdminIn.svelte`, `AdminOut.svelte`, `Promo.svelte` (all wrap fields in
   `Validation`), so the messages are live. Source them from the catalogs and resolve via the
   **standalone formatter** already established in Plan-1's runtime
   (`unwrapFunctionStore(_)` / `formatStandalone(key, { locale, values })` in
   `src/lib/i18n/index.ts`) so it works inside plain `.ts` schema files without component store
   access and stays SSR-safe (explicit `{ locale }`, never `locale.set()` on server). Add the
   needed keys to en/zh/ms. Backend/API (`problem_details`) error strings stay English.
2. **Extend the NFC3 residual-string sweep to script-level literals.** The current sweep only
   scanned `.svelte` markup and missed the `.ts` schema/validation strings. Extend it to also
   flag user-facing string literals in `.ts` (schemas, validation, toast fallbacks); re-run and
   capture the log showing only intentional exclusions remain.
3. **Add a test for localized validation.** Assert a wallet deposit/transfer validation error
   renders in zh/ms (not English) — Type-1 evidence for AC5/NFC3.
4. **Out of scope (do NOT spend loops on it):** the LOW diff-scope artifact (`diff.patch` /
   `files.json` capturing the nested parent repo) is a **harness-level** capture issue; the
   implementer-controlled evidence (`worktree.diff.patch`, live `git -C <worktree>`) is already
   correct and fabrication-proof.

## Changes
- **`src/lib/i18n/locales/{en,zh,ms}.json`** — add keys for the wallet form-validation messages
  above (shared `errors`/`validation` namespace), interpolating any numeric bounds via
  `{ values }`. (The rest of the catalogs — ~799 keys — are already in place.)
- **`src/routes/wallets/deposit/+page.svelte`** & **`src/lib/components/entities/Wallets/transfer.ts`**
  — replace the hardcoded validation literals with catalog-sourced messages via the standalone
  formatter.
- **`src/lib/i18n/index.ts`** — reuse/expose the existing standalone formatter for `.ts` callers
  if not already exported (no new subscription per call — keep the module-scope singleton).
- **The already-completed sweep** (`src/routes/**/*.svelte`, `src/lib/components/**/*.svelte`,
  loaders/superforms copy, locale-aware date/number helpers for booking dates, costs, wallet
  balances, transaction amounts/dates) — **verify only, do not redo.**
- **`tests/` i18n specs** — extend with the wallet-validation zh/ms assertion.
- **The NFC3 sweep script** — extend to cover `.ts` user-facing literals; re-run + capture.

## Spec Adherence
- **G1** → FR1 (all frontend-owned copy incl. toasts, aria-labels, primary title/meta, **and form
  validation messages**; full SEO sweep out of scope), FR3 (structured interpolation; API errors
  stay English).
- **G4** → FR12 (locale-aware dates/numbers for the named values).
- Relies on Plan 1 for FR2/FR4–FR11/FR13.
- Across Plans 1+2, every spec FR is covered.

## Acceptance Criteria

### Functional Checks
- [ ] **AC1** — Customer pages render translated copy under non-English locales (no leftover
  English in extracted areas). *(already met — keep green)*
  - **Evidence (type 1):** `bun run test:integration` → customer-area zh/ms SSR scenarios pass
    (`test-integration-i18n.log`, 48 passed, exit 0).
- [ ] **AC2** — Admin pages (`/costs`, `/discounts`, `/users`) render translated copy under
  non-English locales. *(already met — keep green)*
  - **Evidence (type 1):** same Playwright run → admin-area zh/ms scenarios pass.
- [ ] **AC3** — User-facing dates and monetary/numeric values render in locale form (booking
  dates, costs, wallet balance, transaction amounts/dates). *(already met — keep green)*
  - **Evidence (type 1):** Playwright per-locale date+money assertions + `format.test.ts` unit
    tests pass.
- [ ] **AC4** — Interpolated strings driven by `{ values }`, not concatenation. *(already met)*
  - **Evidence (type 2):** reviewer inspects catalog entries + call sites for interpolated keys.
- [ ] **AC5** — **(NEW)** Wallet form-validation errors render in the active locale (zh/ms), not
  English, on the reachable deposit + transfer/admin paths.
  - **Evidence (type 1):** `bun run test:integration` → a new scenario triggers a wallet
    deposit/transfer validation error under `zh` (and `ms`) and asserts the localized message is
    shown and the English literal is absent.

### Non-Functional Checks
- [ ] **NFC1** — All three catalogs remain in sync (incl. the new validation keys).
  - **Evidence (type 1):** `bun run i18n:check` → exit 0 (en/zh/ms share one key set).
- [ ] **NFC2** — Type-check and build stay green.
  - **Evidence (type 1):** `bun run check` → 0 errors; `bun run build` succeeds.
- [ ] **NFC3** — No significant residual hardcoded user-facing copy remains in extracted areas —
  **including script-level `.ts` validation/error literals**.
  - **Evidence (type 1):** the extended sweep (covering `.svelte` AND `.ts` user-facing literals)
    → output reviewed; only intentional exclusions (UI primitives, API-error passthrough) remain,
    and the wallet-validation literals no longer appear.
- [ ] **NFC4** — zh/ms catalogs clearly flagged as provisional machine translation. *(already met)*
  - **Evidence (type 2):** reviewer inspects `src/lib/i18n/README.md` provenance note.

## Validation Approach
- **Immediate automated:** the extended Playwright zh/ms spot-checks (now incl. wallet
  validation), `i18n:check`, `bun run check`, `bun run build`, and the extended residual-string
  sweep (`.svelte` + `.ts`) — all green.
- **Manual immediate:** spot-check wallet deposit/admin transfer forms in zh + ms; confirm no
  English validation copy and no layout breakage from longer strings.
- **Post-release (manual):** native-speaker review of zh + ms catalogs — flagged follow-up.
