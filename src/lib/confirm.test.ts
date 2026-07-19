import { describe, expect, it } from 'vitest';
import { confirmMatches, confirmProgress, normalizeConfirm } from './confirm';

describe('confirmMatches', () => {
  it('matches an exact value', () => {
    expect(confirmMatches('John Tan', 'John Tan')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(confirmMatches('john tan', 'John Tan')).toBe(true);
    expect(confirmMatches('JOHN TAN', 'John Tan')).toBe(true);
  });

  it('ignores leading/trailing whitespace on either side', () => {
    expect(confirmMatches('  John Tan  ', 'John Tan')).toBe(true);
    expect(confirmMatches('John Tan', '  John Tan  ')).toBe(true);
    expect(confirmMatches('\tjohn tan\n', '  John Tan ')).toBe(true);
  });

  it('rejects genuinely different text', () => {
    expect(confirmMatches('Jon Tan', 'John Tan')).toBe(false);
  });

  it('rejects internal whitespace differences', () => {
    expect(confirmMatches('JohnTan', 'John Tan')).toBe(false);
  });

  it('never matches when the target is blank', () => {
    expect(confirmMatches('', '')).toBe(false);
    expect(confirmMatches('   ', '   ')).toBe(false);
  });
});

describe('normalizeConfirm', () => {
  it('trims and lowercases', () => {
    expect(normalizeConfirm('  John TAN  ')).toBe('john tan');
  });
});

describe('confirmProgress', () => {
  it('marks matched, pending and total against the trimmed target', () => {
    const p = confirmProgress('Jo', '  John  ');
    expect(p.total).toBe(4);
    expect(p.correct).toBe(2);
    expect(p.caret).toBe(2);
    expect(p.overflow).toBe('');
    expect(p.cells.map(c => c.state)).toEqual(['correct', 'correct', 'pending', 'pending']);
  });

  it('flags mismatched characters as wrong (case-insensitive)', () => {
    const p = confirmProgress('joXn', 'John');
    expect(p.cells.map(c => c.state)).toEqual(['correct', 'correct', 'wrong', 'correct']);
    expect(p.correct).toBe(3);
  });

  it('reports overflow when the user types past the target', () => {
    const p = confirmProgress('Johnny', 'John');
    expect(p.overflow).toBe('ny');
    expect(p.caret).toBe(4);
  });

  it('ignores leading whitespace so characters stay aligned', () => {
    const p = confirmProgress('   Jo', 'John');
    expect(p.cells.map(c => c.state)).toEqual(['correct', 'correct', 'pending', 'pending']);
    expect(p.correct).toBe(2);
  });
});
