# Add multi-language support (i18n) to BunnyBooker (argon)

**ID:** 86ey0w4k6
**Status:** backlog
**Type:** task
**List:** Engineering
**URL:** https://app.clickup.com/t/86ey0w4k6
**Created:** 2026-06-22
**Updated:** 2026-06-22

## Description

Add multi-language support (i18n) to BunnyBooker (argon)

### Problem

BunnyBooker (the argon SvelteKit frontend, nitroso platform) is English-only.
All user-facing copy (~300–400 strings across ~158 .svelte files) is hardcoded in
English, with no i18n infrastructure. The audience — cross-border SG↔JB KTMB train
travelers — is multilingual.

### Desired outcome

Users can use the whole app (customer-facing and admin) in English, Chinese
(Simplified), or Bahasa Melayu, with:

- Auto-detection of language from the browser on first visit (Accept-Language).
- An in-app language picker to switch languages.
- Language choice persisted in a cookie and honored during SSR (no flash).
- No page reload when switching — text updates instantly and reactively.
- Clean URLs (no /en, /zh path prefixes).

### Approach / constraints

- Library: svelte-i18n (runtime, store-based) — instant reactive switching fits
  Svelte 4; lazy-loaded per-locale JSON catalogs.
- Extract all frontend-owned copy into en / zh / ms catalogs (en authored;
  zh + ms machine-translated first pass, flagged for human review).
- Locale-aware date/number formatting (reuse date-fns / @internationalized/date).
- Add a missing-key check / CI lint so all locale catalogs stay in sync.
- Dynamic `<html lang>`; backend-sourced API error strings stay English unless the
  API localizes too.
- Tests: Playwright for auto-detect / switch / persist; unit-test locale resolution.

## Hierarchy

No parent task or epic. No subtasks.

## Comments

No comments found.
