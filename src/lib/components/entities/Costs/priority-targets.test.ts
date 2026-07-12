import { describe, expect, it } from 'vitest';
import { buildTarget, emptyTargetDraft, parseTarget, targetDraftValid } from './priority-targets';

describe('parseTarget', () => {
  it('parses null/undefined (target unset) to null', () => {
    expect(parseTarget(null)).toBeNull();
    expect(parseTarget(undefined)).toBeNull();
  });

  it('parses a wire target into editor state', () => {
    expect(
      parseTarget({
        matchMode: 'All',
        matches: [
          { matchType: 'Role', value: 'vip' },
          { matchType: 'UserId', value: 'U123' },
        ],
      }),
    ).toEqual({
      matchMode: 'All',
      matches: [
        { matchType: 'Role', value: 'vip' },
        { matchType: 'UserId', value: 'U123' },
      ],
    });
  });

  it('coerces unknown modes/types to safe defaults instead of crashing', () => {
    const d = parseTarget({ matchMode: 'garbage', matches: [{ matchType: 'garbage', value: null }] });
    expect(d).toEqual({ matchMode: 'Any', matches: [{ matchType: 'UserId', value: '' }] });
  });

  it('treats missing matches as an empty list', () => {
    expect(parseTarget({ matchMode: 'None', matches: null })).toEqual({ matchMode: 'None', matches: [] });
  });
});

describe('buildTarget', () => {
  it('builds null (nobody free / legacy access) from a null draft', () => {
    expect(buildTarget(null)).toBeNull();
  });

  it('lowercases role values and trims everything', () => {
    expect(
      buildTarget({
        matchMode: 'Any',
        matches: [
          { matchType: 'Role', value: '  VIP ' },
          { matchType: 'UserId', value: ' U123 ' },
        ],
      }),
    ).toEqual({
      matchMode: 'Any',
      matches: [
        { matchType: 'Role', value: 'vip' },
        { matchType: 'UserId', value: 'U123' },
      ],
    });
  });

  it('drops empty matches', () => {
    expect(
      buildTarget({
        matchMode: 'Any',
        matches: [
          { matchType: 'Role', value: '   ' },
          { matchType: 'UserId', value: 'U1' },
        ],
      }),
    ).toEqual({ matchMode: 'Any', matches: [{ matchType: 'UserId', value: 'U1' }] });
  });
});

describe('round-trip', () => {
  it('build(parse(x)) preserves a normalized wire target', () => {
    const wire = {
      matchMode: 'All',
      matches: [
        { matchType: 'Role', value: 'staff' },
        { matchType: 'UserId', value: 'U42' },
      ],
    };
    expect(buildTarget(parseTarget(wire))).toEqual(wire);
  });

  it('parse(build(d)) preserves a clean draft', () => {
    const draft = {
      matchMode: 'Any' as const,
      matches: [{ matchType: 'Role' as const, value: 'vip' }],
    };
    expect(parseTarget(buildTarget(draft))).toEqual(draft);
  });
});

describe('targetDraftValid', () => {
  it('accepts null and drafts whose chips all have values', () => {
    expect(targetDraftValid(null)).toBe(true);
    expect(targetDraftValid(emptyTargetDraft())).toBe(true);
    expect(targetDraftValid({ matchMode: 'Any', matches: [{ matchType: 'Role', value: 'vip' }] })).toBe(true);
  });

  it('rejects drafts with an empty chip value', () => {
    expect(targetDraftValid({ matchMode: 'Any', matches: [{ matchType: 'Role', value: ' ' }] })).toBe(false);
  });
});
