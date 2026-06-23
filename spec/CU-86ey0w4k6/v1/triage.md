# Triage: Add multi-language support (i18n) to BunnyBooker (argon)

> **What changed v1 -> v2:** the blocking scaffold decision is resolved. The existing
> uncommitted i18n foundation on `pichu` has been **discarded** (per user direction); the run
> builds the **whole feature fresh through the normal pipeline**, landing as one self-contained
> PR. The discarded scaffold's design is captured below as a known-good blueprint for the spec.

## Complexity
moderate — broad and partly mechanical, but now includes building the i18n infrastructure
itself (not just the string sweep). The bulk remains a large extraction across ~155 `.svelte`
files; the architecture is well-understood (validated by the now-discarded prototype).

## Repo Set & Dependency Order
**Single repo.** `argon` only — the SvelteKit frontend.
- Path: `/Users/erng/Workspace/atomi/runbook/platforms/nitroso/argon`
- Remote: `github-atomi:AtomiCloud/nitroso.argon.git`
- Default branch: `pichu`
No backend/infra repo is touched (API error strings stay English per the ticket).

## Assessment
Build multi-language support (en / zh-Hans / ms) into argon **from a clean base**. A complete
SSR-safe `svelte-i18n` prototype previously existed uncommitted on `pichu` but was **discarded**
per user direction — so the run starts greenfield and produces the entire feature in one PR:
(1) the i18n runtime + locale negotiation + SSR no-flash wiring + dynamic `<html lang>`,
(2) en / zh / ms catalogs with all ~300+ user-facing strings extracted across ~155 components,
(3) a `LanguagePicker` for instant no-reload switching, (4) a catalog-sync CI lint, and
(5) Playwright + unit tests. The discarded prototype proved the architecture works, so design
risk is low; the work is mostly volume + consistency.

## Things to Check
- **String inventory:** sweep all `src/**/*.svelte` (159 files) + any TS that emits user copy
  (toasts via `svelte-sonner`, form errors, superforms messages, `+page.ts`/load errors) to
  enumerate hardcoded English strings. Distinguish frontend-owned copy from backend/API error
  strings (which stay English).
- **SSR locale-singleton pitfall (svelte-i18n #165):** the `locale` store is process-wide.
  Never `locale.set()` on the server; pass `{ locale }` explicitly per `$_(...)` call and warm
  the dictionary via `waitLocale` so SSR reads a request-scoped locale (no cross-request bleed,
  no flash-of-fallback). This was the prototype's core design and must be reproduced.
- **Interpolation / pluralization:** strings with embedded values (e.g. `BALANCE: SGD {amount}`)
  must use the `{ values }` pattern consistently.
- **Date/number formatting:** existing `date-fns` / `date-fns-tz` / `@internationalized/date`
  usages - make them locale-aware.
- **Locale negotiation:** cookie -> `Accept-Language` best-match -> `en` fallback; a tampered
  (present-but-unsupported) cookie must fall back to `en`, never select via Accept-Language.
- **Tests harness:** `playwright.config.ts` exists - confirm how Playwright boots the app and
  whether tests can control the `Accept-Language` header + inspect cookies. `vitest` for units.
- **CI lint coverage:** the catalog-sync check must fail on missing/extra keys across all three
  catalogs and run in CI (wired into the `check` script).
- **Clean URLs:** no `/en`, `/zh` path prefixes - locale lives in cookie + `<html lang>` only.

## Open Questions
1. ~~How to handle the existing uncommitted i18n scaffold?~~ **RESOLVED** — discard it and build
   fresh through the pipeline; whole feature in one PR. (Done: scaffold removed from `pichu`.)
2. **Scope of "all user-facing copy":** customer-facing + admin both in scope (ticket says yes).
   To confirm in spec: are `aria-label`s, `<title>`/SEO meta, and toast messages in scope, or
   visible copy only? (Recommended default: all visible copy + toasts + aria-labels in scope;
   SEO meta best-effort.)
3. **zh/ms translation quality bar:** machine-translated first pass flagged for human review is
   acceptable per the ticket - confirm we are NOT blocking on native review. (Recommended: yes,
   provisional translations are fine; flag for follow-up review.)
4. **Date/number formatting depth:** in scope now vs fast-follow? (Recommended: locale-aware
   formatting for the obvious date/number renders is in scope; exhaustive audit is fast-follow.)

These are non-blocking — the spec phase resolves them. Defaults above unless you say otherwise.

## Clarifications
- Org/LPSM confirmed at session start: atomicloud, Platform=`nitroso`, Service=`argon`.
- Single repo confirmed (argon has its own git remote `AtomiCloud/nitroso.argon`).
- **Scaffold decision (confirmed):** discard the uncommitted prototype; build fresh per pipeline;
  one self-contained PR. Branch slug: `i18n` -> `adelphi-liong/CU-86ey0w4k6-i18n`.

## Risks
**Moderate.** Touching ~155 components is high-surface but low-depth - risk is mechanical
regression (broken interpolation, missed strings, SSR locale races) rather than architectural.
The architecture is proven (validated by the discarded prototype) and catalog drift is guarded
by the CI sync lint. Main risks: (a) consistency across a large sweep, (b) reproducing the
SSR-safe locale handling correctly so there is no cross-request bleed or flash, (c) longer
zh/ms strings causing layout breakage on some pages.

## Verification

### Assumptions to Verify
- **`svelte-i18n@^4` SSR pattern** (no `locale.set` on server; explicit `{ locale }` per call;
  `waitLocale` warming) is correct - verify by booting the app and switching locales (no flash,
  no cross-request bleed under concurrent SSR).
- **Catalog-sync lint** actually enforces all three catalogs share one key set - verify by run.
- **Playwright harness boots the SvelteKit app** so auto-detect/switch/persist tests can drive
  it (Accept-Language header control + cookie inspection).
- The ~300-400 string estimate - verify with an actual grep-based inventory during spec.

### Access Required
None beyond the local repo. App is locally runnable (the nitroso stack bring-up is known).

### Testing Level
**moderate.** Unit-test locale resolution. Playwright for the three behaviors the ticket names
(auto-detect, switch, persist). No heavy cross-browser matrices.

### Validation Matrix
- **Automated immediate:** catalog-sync lint + `svelte-check` + vitest unit tests (locale
  resolution) + Playwright (auto-detect / switch / persist) - all in CI.
- **Manual immediate:** spot-check a few high-traffic pages in zh + ms for layout breakage from
  longer strings; confirm no flash-of-fallback on SSR.
- **Automated post-release:** none specific.
- **Manual post-release:** native-speaker review of zh + ms catalogs (flagged follow-up, not a
  blocker for this ticket).
