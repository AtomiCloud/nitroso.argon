#!/usr/bin/env node
/**
 * Catalog-sync lint.
 *
 * Deep-flattens every locale catalog and fails (exit 1) if any non-`en` catalog
 * is missing a key present in `en`, or carries an extra key not present in `en`.
 * `en` is the source of truth.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const localesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib', 'i18n', 'locales');
const LOCALES = ['en', 'zh', 'ms'];

function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out[path] = true;
    }
  }
  return out;
}

function loadKeys(locale) {
  const file = join(localesDir, `${locale}.json`);
  return flatten(JSON.parse(readFileSync(file, 'utf8')));
}

const catalogs = Object.fromEntries(LOCALES.map(l => [l, loadKeys(l)]));
const enKeys = Object.keys(catalogs.en).sort();

let failed = false;
for (const locale of LOCALES.filter(l => l !== 'en')) {
  const keys = catalogs[locale];
  const missing = enKeys.filter(k => !(k in keys));
  const extra = Object.keys(keys)
    .filter(k => !(k in catalogs.en))
    .sort();

  if (missing.length > 0 || extra.length > 0) {
    failed = true;
    if (missing.length > 0) console.error(`[${locale}] missing keys: ${missing.join(', ')}`);
    if (extra.length > 0) console.error(`[${locale}] extra keys: ${extra.join(', ')}`);
  }
}

if (failed) {
  console.error('\ni18n catalogs are out of sync.');
  process.exit(1);
}

console.log(`i18n catalogs in sync ✓ (${enKeys.length} keys × ${LOCALES.length} locales)`);
