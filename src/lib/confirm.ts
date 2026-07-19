// Shared logic for "type the name to confirm" flows (booking cancellation,
// passenger deletion). The stored value can carry hidden leading/trailing
// whitespace, and customers get tripped up by capitalisation, so matching is
// trimmed + case-insensitive. See TypeToConfirm.svelte for the UI.

export function normalizeConfirm(value: string): string {
  return value.trim().toLowerCase();
}

export function confirmMatches(value: string, target: string): boolean {
  const trimmedTarget = target.trim();
  return trimmedTarget.length > 0 && normalizeConfirm(value) === trimmedTarget.toLowerCase();
}

export type ConfirmCharState = 'correct' | 'wrong' | 'pending';

export interface ConfirmCell {
  ch: string;
  state: ConfirmCharState;
}

export interface ConfirmProgress {
  cells: ConfirmCell[];
  // Characters typed beyond the length of the target (too long).
  overflow: string;
  // Index of the next character to type, clamped to the target length.
  caret: number;
  correct: number;
  total: number;
}

// Per-character comparison driving the "typeracer" preview. Leading whitespace
// the user types is ignored so a stray space does not shove every following
// character into a "wrong" state.
export function confirmProgress(value: string, target: string): ConfirmProgress {
  const cleanTarget = target.trim();
  const typed = value.replace(/^\s+/, '');

  const cells: ConfirmCell[] = [...cleanTarget].map((ch, i) => {
    const t = typed[i];
    const state: ConfirmCharState =
      t === undefined ? 'pending' : t.toLowerCase() === ch.toLowerCase() ? 'correct' : 'wrong';
    return { ch, state };
  });

  const overflow = typed.length > cleanTarget.length ? typed.slice(cleanTarget.length) : '';
  const caret = Math.min(typed.length, cleanTarget.length);
  const correct = cells.filter(c => c.state === 'correct').length;

  return { cells, overflow, caret, correct, total: cleanTarget.length };
}
