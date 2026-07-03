# Spec: Add multi-language support (i18n) to BunnyBooker (argon)

## Summary
BunnyBooker (the `argon` SvelteKit frontend on the `nitroso` platform) is English-only: all
user-facing copy is hardcoded English with no i18n infrastructure. Its audience — cross-border
SG↔JB KTMB train travelers — is multilingual. This change makes the whole app (customer-facing
and admin) usable in **English, Simplified Chinese (zh), and Bahasa Melayu (ms)**, with
automatic language detection, an instant in-app switcher, and correct server-rendered output
from the first paint.

## Background & Context
argon is a Svelte 4 / SvelteKit app rendered with SSR. Today every string lives inline in
English across ~159 `.svelte` files (~300–400 user-facing strings) plus some TypeScript that
emits copy (toast notifications, form/validation messages, load-time errors). There is no
catalog, no locale negotiation, and no switcher.

A complete SSR-safe `svelte-i18n` prototype was recently built and validated locally, then
**discarded** (per the triage decision) so this work lands as one clean, self-contained PR
built through the normal pipeline. That prototype proved the architecture is sound — runtime
store-based catalogs, request-scoped locale during SSR, cookie + `Accept-Language` negotiation,
instant client switching — so the **design risk is low**; the effort is mostly the breadth of
extracting every string consistently and reproducing the SSR-safe locale handling correctly.

The audience and the cross-border nature of the product make this material: many users are more
comfortable in Chinese or Malay than English, and a wrong-language or flashing first paint
directly hurts trust and conversion for a booking/payments flow.

## Goals
- **G1 — Full trilingual app.** Every frontend-owned user-facing string (customer-facing and
  admin) can be presented in English, Simplified Chinese, or Bahasa Melayu. Backend/API-sourced
  error strings remain English unless/until the API localizes them.
- **G2 — Effortless language choice.** The app detects the user's preferred language on first
  visit from the browser, offers an in-app picker to change it, switches **instantly with no
  page reload**, and remembers the choice across visits.
- **G3 — Correct from the first paint.** Server-rendered pages render in the chosen/detected
  language with no flash of fallback copy, set a correct dynamic `<html lang>`, and keep URLs
  clean (no `/en`, `/zh` path prefixes).
- **G4 — Stays correct over time.** Translation catalogs are kept in sync automatically, dates
  and numbers render appropriately for the active locale, and the key behaviors are covered by
  automated tests so regressions are caught.

## Approach (high level)
> **Ticket-imposed constraints (not free design choices):** the ticket mandates the i18n
> library (`svelte-i18n`, runtime/store-based) and that the language choice is persisted **in a
> cookie** and honored during SSR. These are recorded here as given constraints; the plan phase
> owns all remaining mechanics (file layout, key naming, exact APIs).

Adopt a **runtime, store-based i18n layer** (the ticket-named `svelte-i18n`), where each
locale's strings live in its own lazily-loaded catalog and components read the active
translation reactively. English is the **authored source of truth**; Chinese and Malay are
produced as a **machine-translated first pass, explicitly flagged as unreviewed** and queued
for later native-speaker review.

Language is resolved per request by **negotiation**: a valid saved preference (cookie) wins;
otherwise the browser's `Accept-Language` best match among the supported locales; otherwise
English. The resolved locale is established **before first render** so SSR output is already in
the right language (no flash) and drives the `<html lang>` attribute. Switching language in the
app updates the UI **reactively on the client without a reload** and updates the saved
preference.

Because the i18n runtime's active-locale state is process-wide on the server, the design treats
SSR locale as **request-scoped** (never mutating shared global locale state on the server) so
concurrent requests for different languages cannot bleed into each other. Locale-aware date and
number formatting reuses the libraries already in the app. A **catalog-sync check** runs in CI
so the three catalogs always share one key set, and **automated tests** cover detection,
switching, persistence, and locale resolution.

The extraction is done as a consistent sweep across the codebase: identify frontend-owned
copy (including toasts and accessibility labels), move it into namespaced catalog keys, and
render it through the i18n layer — keeping interpolated values (amounts, counts, names) as
structured parameters rather than concatenated strings.

## Requirements (derived from the Goals)
- **FR1** (→ G1) — All frontend-owned user-facing strings across the app (customer-facing and
  admin) are sourced from translation catalogs rather than hardcoded, covering visible copy,
  toast/notification messages, and accessibility labels (e.g. `aria-label`s). Per-page primary
  `<title>` / meta-description text is also localized; a comprehensive SEO/structured-data
  localization sweep is out of scope (see Non-Goals).
- **FR2** (→ G1) — Three catalogs exist — English (authored), Simplified Chinese, and Bahasa
  Melayu — sharing one identical key set. Chinese and Malay may be a machine-translated first
  pass, clearly marked as unreviewed/provisional.
- **FR3** (→ G1) — Strings containing dynamic values (amounts, counts, names, etc.) are
  represented with structured interpolation so each language controls word order, not via
  English-shaped string concatenation. Backend/API-sourced error strings are left in English.
- **FR4** (→ G2) — On a visitor's first arrival (no saved preference), the app selects a
  supported language by best-matching the browser's `Accept-Language`, falling back to English
  when none match.
- **FR5** (→ G2) — An in-app language picker lets the user choose English, Chinese, or Malay;
  selecting a language updates all visible copy **immediately, without a full page reload**.
- **FR6** (→ G2) — The chosen language is persisted (cookie) and honored on subsequent visits
  and requests; a saved valid preference takes precedence over `Accept-Language`.
- **FR7** (→ G3) — Server-rendered HTML is already in the resolved language on first paint, with
  no flash of fallback/English copy before hydration.
- **FR8** (→ G3) — The document's `<html lang>` reflects the active language, and no
  language-specific URL path prefixes are introduced (URLs stay clean).
- **FR9** (→ G3) — Under concurrent SSR for different languages, each response renders in its
  own request's language with no cross-request contamination.
- **FR10** (→ G3) — A saved preference that is missing, malformed, or names an unsupported
  language safely falls back to English and is not allowed to influence detection.
- **FR11** (→ G4) — A catalog-sync check runs in CI (and locally) and fails when any non-English
  catalog is missing keys present in English or contains keys English does not, so catalogs
  cannot silently drift.
- **FR12** (→ G4) — User-facing dates/times and numeric/monetary values — specifically booking
  dates and times, costs/prices, wallet balances, and transaction amounts and dates — are
  formatted appropriately for the active locale. (A blanket audit of every numeric render in the
  app is a fast-follow; see Non-Goals.)
- **FR13** (→ G4) — Automated tests cover the key behaviors: language auto-detection, switching,
  persistence across requests, and locale resolution (including the unsupported/tampered
  fallback).

## Non-Goals / Out of Scope
- Localizing backend/API error messages or any server-owned copy (stays English until the API
  localizes).
- Native-speaker review / professional translation of the Chinese and Malay catalogs — the
  first pass is machine-translated and flagged; human review is a follow-up.
- Adding languages beyond English, Chinese, and Malay.
- Localized routing / per-language URL paths (explicitly avoided — URLs stay clean).
- An exhaustive audit guaranteeing locale-aware formatting of every single date/number in the
  app (the named user-facing values in FR12 are in scope; a complete sweep is a fast-follow).
- A comprehensive SEO / structured-data / Open Graph localization sweep (primary page title and
  meta description are in scope per FR1; the rest is a follow-up).
- RTL layout support (none of the three target languages requires it).
- Currency conversion or locale-specific pricing (amounts remain in their existing currency).

## Open Questions & Risks
- **Completeness of the string sweep.** Risk that some hardcoded strings are missed across ~159
  files. Mitigation: the CI catalog-sync check plus a systematic sweep; confirmable by grepping
  for residual hardcoded copy and by manual spot-checks in non-English locales.
- **SSR locale correctness.** The i18n runtime's active-locale is process-wide; getting
  request-scoping wrong would cause cross-request language bleed or a flash. Mitigation: the
  request-scoped SSR approach (validated by the discarded prototype); confirmable by exercising
  concurrent different-language SSR and checking first-paint output.
- **Translation quality.** Machine-translated zh/ms may read awkwardly. Accepted for this
  ticket (flagged provisional); native review is a follow-up.
- **Layout fragility.** Longer translated strings (especially Malay) may break tight layouts.
  Mitigation: spot-check high-traffic pages in each locale; treat egregious breakage as in-scope
  fixes, cosmetic polish as follow-up.
- **Test harness.** Assumption that the existing end-to-end test setup can drive `Accept-Language`
  and inspect cookies; to be confirmed in the plan phase.

## Success Criteria
- A user with a Chinese or Malay browser preference, arriving fresh, sees the app in that
  language on the very first paint — no English flash — with a correct `<html lang>`.
- Any user can switch between English, Chinese, and Malay from an in-app picker and watch all
  visible copy update immediately, without the page reloading.
- The chosen language survives navigation and a return visit (persisted), and takes precedence
  over browser detection.
- Browsing the app (customer and admin) in Chinese or Malay shows translated copy throughout,
  with only backend/API error strings and explicitly out-of-scope items remaining English.
- Dynamic values (amounts, counts, names) read naturally in each language, not as English-shaped
  fragments.
- URLs contain no language path prefixes in any locale.
- The CI catalog-sync check fails if a translation key is added to one catalog but not the
  others, and passes when all three are in sync.
- Automated tests for auto-detect, switch, persist, and locale resolution (including the
  tampered/unsupported-preference fallback to English) pass.
