# Resolution — plan-2 (max_iterations, avg 95%)

## Strategy: refine_local
The plan and spec are sound — the synthesis checkpoint explicitly found **no spec-level
conflict**. kloop run `b4d20rql` exhausted its 7-loop budget because one strict reviewer
(codex verifier) kept rejecting over a single residual gap while the other reviewer approved
every loop (99–100%). The implementation is ~95% complete in the worktree (80 changed files,
all standard gates green). This needs **targeted gap-closure + evidence**, NOT a replan or a
rebuild.

## kloop evidence (run b4d20rql)
- 7/7 loops, final verdict REJECTED (max iterations), avg 95% completion.
- Reviewer-0 (opus): APPROVE 100% every loop. Reviewer-1/verifier (codex/gpt): REJECT, driven
  by ONE HIGH (below). Verifier completionEstimate: 90.
- All standard gates pass and were re-run live by both reviewers: `build` ✓, `typecheck` 0/0,
  `i18n:check` 799 keys × 3 locales exit 0, `lint` 0/0, `unit` 34 passed, `integration` 48
  passed (incl. customer + admin zh/ms SSR, load-error cases, locale date/money), verify-keys
  825→0 missing. AC1–AC4, NFC1, NFC2, NFC4 all met with passing evidence.

## What must change (the ONLY blocking gap)
**HIGH — Wallet form-validation strings are still hardcoded English and are user-reachable.**
`src/lib/components/core/Validation.svelte:20` renders `error?.message` directly to the UI, so
these Zod/schema literals show up untranslated under zh/ms:
- `src/routes/wallets/deposit/+page.svelte:34` — "Top up amount must be greater than 5"
- `src/routes/wallets/deposit/+page.svelte:35` — "Top up amount be a finite number"
- `src/routes/wallets/deposit/+page.svelte:40` — "Maximum precision of 2"
- `src/lib/components/entities/Wallets/transfer.ts:4` — "Amount must be greater than 0" /
  "Amount must be a finite number"
- `src/lib/components/entities/Wallets/transfer.ts:8,9` — description length errors
These schemas are consumed by `AdminIn.svelte`, `AdminOut.svelte`, `Promo.svelte` (all wrap the
fields in `Validation`), so the messages are live, not inert constants.

### Required fixes
1. Localize these validation messages: source them from the i18n catalogs (add the keys to
   en/zh/ms) and resolve them where the message is rendered/produced — using the existing
   standalone formatter pattern (`formatStandalone` / explicit `{ locale }`) so it stays
   SSR-safe and works in plain `.ts` schema files (no component `$` store access there).
   Backend/API (`problem_details`) error strings remain English — unchanged.
2. Extend the NFC3 residual-hardcoded-string sweep so it ALSO catches **script-level
   validation literals** (`.ts` schema/error strings), not just `.svelte` markup. Re-run it and
   capture the log showing only intentional exclusions remain.
3. Add/extend a test asserting a wallet deposit/transfer validation error renders in zh/ms
   (not English) — Type-1 evidence for AC1/NFC3 in this category.

## Constraints
- **Do NOT rebuild.** Build on the existing ~95% worktree state (80 changed files); only close
  the gap above and refresh evidence. Keep every currently-green gate green.
- Keep all prior AC/NFC evidence intact; this is additive.
- The LOW diff-scope artifact (harness captures the parent repo because the worktree is nested
  inside it) is a **harness-level** issue, NOT in scope for the implementer — the implementer's
  own evidence (`worktree.diff.patch`, live `git -C <worktree>`) is already correct and
  fabrication-proof. Do not spend loops on it.

## Scope
- Plan(s) affected: **plan-2 only.** plan-1 is committed and unaffected.
