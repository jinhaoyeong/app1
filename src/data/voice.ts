import type { MoodLevel } from '@/types';
import type { PhaseKey } from '@/theme/tokens';

/**
 * Luma answers when you tell it something. Short, warm, never dramatic and
 * never advice — the point is that logging feels like being heard rather than
 * filing a form.
 */
export const MOOD_REPLY: Record<MoodLevel, string> = {
  great: 'Worth remembering what today looked like.',
  good: 'Noted — good days are part of the pattern too.',
  okay: 'Okay is a perfectly good day to have.',
  low: 'Noted. Be gentle with yourself today.',
  rough: 'That sounds hard. Logging it helps you see the shape of it.',
};

/**
 * A single line under the greeting that acknowledges where someone is,
 * without claiming to know how they feel.
 */
export function phaseGreeting(phase: PhaseKey): string {
  switch (phase) {
    case 'menstrual':
      return 'Take it gently today.';
    case 'follicular':
      return 'Your energy often builds around here.';
    case 'ovulation':
      return 'Usually your brightest stretch.';
    case 'luteal':
      return 'The quieter part of your cycle.';
    default:
      return 'Getting to know your rhythm.';
  }
}

/** Encouragement tied to how much history exists, never to a streak. */
export function historyNote(loggedDays: number, cycles: number): string {
  if (cycles >= 3) return 'Your baseline is built from your own history.';
  if (loggedDays >= 20) return 'Enough here to start seeing your shape.';
  if (loggedDays >= 5) return 'A picture is starting to form.';
  if (loggedDays >= 1) return 'Every day you note makes this more yours.';
  return 'Start whenever it feels useful.';
}
