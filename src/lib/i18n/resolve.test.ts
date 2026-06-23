import { describe, it, expect } from 'vitest';
import { negotiateLocale, isSupportedLocale, SUPPORTED_LOCALES, DEFAULT_LOCALE } from './resolve';

describe('SUPPORTED_LOCALES / DEFAULT_LOCALE', () => {
  it('exposes exactly en, zh, ms', () => {
    expect([...SUPPORTED_LOCALES]).toEqual(['en', 'zh', 'ms']);
  });

  it('defaults to en', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });
});

describe('isSupportedLocale', () => {
  it.each(['en', 'zh', 'ms'])('accepts %s', l => {
    expect(isSupportedLocale(l)).toBe(true);
  });

  it.each(['fr', 'EN', 'zh-CN', '', null, undefined])('rejects %s', l => {
    expect(isSupportedLocale(l as string)).toBe(false);
  });
});

describe('negotiateLocale — cookie precedence', () => {
  it('a valid supported cookie wins over Accept-Language', () => {
    expect(negotiateLocale({ cookie: 'zh', acceptLanguage: 'ms' })).toBe('zh');
    expect(negotiateLocale({ cookie: 'ms', acceptLanguage: 'en' })).toBe('ms');
    expect(negotiateLocale({ cookie: 'en', acceptLanguage: 'zh' })).toBe('en');
  });

  it('a tampered/unsupported cookie falls back to en and does NOT defer to Accept-Language', () => {
    expect(negotiateLocale({ cookie: 'xx', acceptLanguage: 'zh' })).toBe('en');
    expect(negotiateLocale({ cookie: 'zh-Hans', acceptLanguage: 'zh' })).toBe('en');
    expect(negotiateLocale({ cookie: 'fr', acceptLanguage: 'ms,zh' })).toBe('en');
  });
});

describe('negotiateLocale — Accept-Language best match', () => {
  it('matches a direct supported tag', () => {
    expect(negotiateLocale({ acceptLanguage: 'zh' })).toBe('zh');
    expect(negotiateLocale({ acceptLanguage: 'ms' })).toBe('ms');
    expect(negotiateLocale({ acceptLanguage: 'en' })).toBe('en');
  });

  it('collapses region/script subtags to the primary subtag', () => {
    expect(negotiateLocale({ acceptLanguage: 'zh-CN' })).toBe('zh');
    expect(negotiateLocale({ acceptLanguage: 'zh-Hans' })).toBe('zh');
    expect(negotiateLocale({ acceptLanguage: 'zh-Hant-TW' })).toBe('zh');
    expect(negotiateLocale({ acceptLanguage: 'en-US' })).toBe('en');
    expect(negotiateLocale({ acceptLanguage: 'ms-MY' })).toBe('ms');
  });

  it('honors quality values, picking the highest-quality supported locale', () => {
    // de is unsupported and highest, zh is next supported
    expect(negotiateLocale({ acceptLanguage: 'de;q=1.0,zh;q=0.8,en;q=0.5' })).toBe('zh');
    expect(negotiateLocale({ acceptLanguage: 'en;q=0.3,ms;q=0.9' })).toBe('ms');
  });

  it('skips q=0 (not acceptable) entries', () => {
    // zh explicitly rejected; falls through to en
    expect(negotiateLocale({ acceptLanguage: 'zh;q=0,en;q=0.1' })).toBe('en');
  });

  it('skips unsupported tags and matches the first supported one in priority order', () => {
    expect(negotiateLocale({ acceptLanguage: 'fr-FR,de-DE,ms-MY' })).toBe('ms');
  });

  it('falls back to en when no tag matches', () => {
    expect(negotiateLocale({ acceptLanguage: 'fr,de,ja' })).toBe('en');
  });
});

describe('negotiateLocale — defaults', () => {
  it('returns en with no cookie and no header', () => {
    expect(negotiateLocale({})).toBe('en');
    expect(negotiateLocale({ cookie: null, acceptLanguage: null })).toBe('en');
    expect(negotiateLocale({ cookie: '', acceptLanguage: '' })).toBe('en');
  });
});
