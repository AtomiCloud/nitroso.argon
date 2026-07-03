#!/usr/bin/env node
/**
 * Residual hardcoded-copy sweep (NFC3).
 *
 * Heuristically flags user-facing English that still lives as a literal instead
 * of going through the i18n layer (`$_(...)` / catalog keys). It scans customer +
 * admin routes and the product component directories (entities / custom /
 * complex), in TWO passes:
 *
 *   1. **Markup pass (`.svelte`)** — text nodes between tags that contain real
 *      words but are not a `{...}` expression (so `>Save<` is flagged,
 *      `>{$_('actions.save')}<` is not), plus user-facing attributes
 *      (`placeholder`, `aria-label`, `title`, `alt`) whose value is a bare string
 *      literal rather than a `{...}` binding.
 *
 *   2. **Script pass (`.ts`)** — string literals that read as user-facing prose
 *      (a multi-word English phrase), catching script-level copy the markup pass
 *      cannot see: Zod/schema validation messages, toast fallbacks, and similar.
 *      i18n keys (`'wallets.deposit.title'`) and identifiers/paths/Tailwind class
 *      lists are single-token or hyphen/colon-heavy and are intentionally NOT
 *      flagged. (`.svelte` `<script>` blocks are left to the markup pass plus
 *      `bun run check`; their mix of regex literals and apostrophe'd copy defeats
 *      reliable literal extraction, so scanning them yields only noise.)
 *
 * shadcn-style UI primitives under `components/ui/**` carry no product copy and
 * are intentionally out of scope (left as-is per the plan). Test/spec files
 * (`*.test.ts` / `*.spec.ts`) are also skipped: they embed the literals they
 * assert on (including English source strings, to prove absence) and ship no UI.
 * The check is a lint
 * aid, not a proof of completeness: its output is meant to be reviewed so that
 * only intentional exclusions remain. Exit code is always 0 — it never fails CI;
 * `i18n:check` is the hard gate.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_DIRS = [
  'src/routes',
  'src/lib/components/entities',
  'src/lib/components/custom',
  'src/lib/components/complex',
];

// Directories whose copy is intentionally NOT extracted.
const EXCLUDE_DIR = join('components', 'ui');

// Test/spec files assert ON the very literals this sweep flags (e.g. a test that
// checks a localized validation message also embeds the English source string to
// prove it is absent). They ship no UI, so their assertion literals are noise —
// excluded so the sweep output reflects only shippable source. (NFC3.)
const isTestFile = entry => /\.(test|spec)\.(ts|svelte)$/.test(entry);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (full.includes(EXCLUDE_DIR)) continue;
      walk(full, out);
    } else if ((entry.endsWith('.svelte') || entry.endsWith('.ts')) && !isTestFile(entry)) {
      out.push(full);
    }
  }
  return out;
}

// A captured fragment counts as "user-facing copy" only if it has at least one
// word of two or more letters and is not obviously code/markup noise.
function looksLikeCopy(text) {
  const t = text.trim();
  if (t.length < 2) return false;
  if (!/[A-Za-z]{2,}/.test(t)) return false; // needs real letters
  if (t.startsWith('{') && t.endsWith('}')) return false; // pure expression
  if (/^[A-Za-z][\w$]*$/.test(t)) return false; // bare identifier / single token
  if (/^(https?:|mailto:|\/|#|tel:)/.test(t)) return false; // urls / anchors
  return true;
}

// A string LITERAL (from code) reads as user-facing prose when it is a multi-word
// English phrase. This deliberately excludes i18n keys, identifiers, import
// paths, and Tailwind class lists — none of which a human user ever reads.
function looksLikeProse(text) {
  const t = text.trim();
  if (t.length < 4) return false;
  if (!/\s/.test(t)) return false; // single token (key/identifier/path) — never prose
  if (/^(https?:|mailto:|\/|#|tel:|data:)/.test(t)) return false; // urls / anchors
  const words = t.split(/\s+/);
  // Real words: start with a letter, are alphabetic (allow trailing prose
  // punctuation), and carry >=2 letters. "flex-col" / "gap-2" / "1.0" fail this.
  const proseWords = words.filter(
    w => /^[A-Za-z][A-Za-z'’.,!?:;()-]*$/.test(w) && /[A-Za-z]{2,}/.test(w) && !/-/.test(w),
  );
  if (proseWords.length < 2) return false;
  // Tailwind/utility class list guard: if a meaningful share of tokens look like
  // CSS utility classes (hyphen/colon segments), treat the whole literal as a
  // class string, not prose.
  const classTokens = words.filter(w => /-/.test(w) || /:[a-z0-9-]/.test(w) || /^[a-z]+:[a-z]/.test(w));
  if (classTokens.length >= Math.ceil(words.length / 2)) return false;
  return true;
}

// Strip out `{...}` expressions so a text node that is entirely interpolation
// leaves nothing behind to flag. Applied iteratively from the inside out so
// NESTED braces collapse too — e.g. `{$_('ns.key', { locale: $lang })}` strips
// the inner `{ locale: $lang }` first, then the now-flat outer `{$_(...)}`.
function stripExpressions(s) {
  let prev;
  let out = s;
  do {
    prev = out;
    out = out.replace(/\{[^{}]*\}/g, ' ');
  } while (out !== prev);
  return out;
}

// Remove `//` line comments and `/* */` block comments so commented-out copy and
// developer notes are not flagged as residual user-facing strings.
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

const TEXT_NODE = />([^<>]+)</g;
const ATTR = /\b(placeholder|aria-label|title|alt)\s*=\s*"([^"{}]+)"/g;
// String literals in code: single-quoted, double-quoted, or backtick template.
const STRING_LITERAL = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

// Pull the user-facing prose literals out of a block of script/TS code.
function scanCode(code) {
  const hits = [];
  const clean = stripComments(code);
  for (const m of clean.matchAll(STRING_LITERAL)) {
    let lit = m[0].slice(1, -1); // drop the surrounding quotes
    lit = lit.replace(/\$\{[^}]*\}/g, ' '); // drop `${...}` interpolation in templates
    if (looksLikeProse(lit)) hits.push(`literal: ${lit.trim().slice(0, 80)}`);
  }
  return hits;
}

let total = 0;
const findings = [];

for (const base of TARGET_DIRS) {
  const abs = join(root, base);
  let files;
  try {
    files = walk(abs);
  } catch {
    continue; // dir may not exist
  }
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const rel = relative(root, file);
    const hits = [];

    if (file.endsWith('.svelte')) {
      // Markup pass: drop <script>/<style>, scan the remaining markup.
      const markup = src.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
      for (const m of markup.matchAll(TEXT_NODE)) {
        const residual = stripExpressions(m[1]);
        if (looksLikeCopy(residual)) hits.push(`text: ${residual.trim().slice(0, 80)}`);
      }
      for (const m of markup.matchAll(ATTR)) {
        const [, attr, value] = m;
        if (looksLikeCopy(value)) hits.push(`${attr}: ${value.slice(0, 80)}`);
      }
    } else {
      // Plain `.ts` module: scan the whole file's literals for prose.
      hits.push(...scanCode(src));
    }

    if (hits.length > 0) {
      total += hits.length;
      findings.push({ rel, hits });
    }
  }
}

if (findings.length === 0) {
  console.log('i18n sweep: no residual hardcoded user-facing copy found in extracted areas ✓');
} else {
  console.log(
    `i18n sweep: ${total} candidate(s) across ${findings.length} file(s) — review for intentional exclusions:\n`,
  );
  for (const { rel, hits } of findings) {
    console.log(`  ${rel}`);
    for (const h of hits) console.log(`    - ${h}`);
  }
}
// Advisory only — never fails CI.
process.exit(0);
