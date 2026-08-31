import type { lightColors } from '@/theme/palette';

/**
 * How the phase palette is applied.
 *
 * Colour data lives in `palette.ts`; this is the arithmetic on top of it —
 * which pigment a named phase gets, and how the dial fades one into the next
 * instead of butting two solid blocks together. Pure, so it can be tested
 * without react-native.
 */

export type PhaseKey =
  'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'unknown';

export type Phases = (typeof lightColors)['phases'];

export type Pigment = { deep: string; soft: string };

/**
 * A named phase's pair. `unknown` has no pigment of its own — a cycle we have
 * not learned yet should not be given a confident colour, so callers fall back
 * to the accent.
 */
export function phasePigment(phases: Phases, phase: PhaseKey): Pigment | null {
  switch (phase) {
    case 'menstrual':
      return { deep: phases.menstrual, soft: phases.menstrualSoft };
    case 'follicular':
      return { deep: phases.follicular, soft: phases.follicularSoft };
    case 'ovulation':
      return { deep: phases.fertile, soft: phases.fertileSoft };
    case 'luteal':
      return { deep: phases.luteal, soft: phases.lutealSoft };
    default:
      return null;
  }
}

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function hex2(value: number): string {
  return Math.round(Math.max(0, Math.min(255, value)))
    .toString(16)
    .padStart(2, '0');
}

/** Straight sRGB blend. Close enough over the short hops the ramp asks for. */
export function mixHex(from: string, to: string, t: number): string {
  const amount = Math.max(0, Math.min(1, t));
  const a = channels(from);
  const b = channels(to);
  return `#${a.map((c, i) => hex2(c + (b[i] - c) * amount)).join('')}`;
}

export type RampPhase = {
  start: number;
  end: number;
  from: string;
  to: string;
};

export type RampStop = {
  /** Position along the cycle, in days from the start of day one. */
  at: number;
  color: string;
};

/**
 * Colour stops for one continuous ring.
 *
 * Each phase keeps its own identity across the middle of its span, and the
 * space between two phases' inner stops is what the fade happens over — so a
 * boundary is a gradual hand-off rather than an edge. The inset is a share of
 * the phase's own length, which keeps a two-day phase from being swallowed by
 * the blend on either side of it.
 */
export function buildPhaseRamp(phases: readonly RampPhase[]): RampStop[] {
  const stops: RampStop[] = [];
  for (const phase of phases) {
    const head = phase.start - 1;
    const span = phase.end - head;
    if (span <= 0) continue;
    const inset = Math.min(span * 0.45, Math.max(0.35, span * 0.3));
    stops.push({ at: head + inset, color: phase.from });
    stops.push({ at: phase.end - inset, color: phase.to });
  }
  return stops.sort((a, b) => a.at - b.at);
}

/**
 * The ramp colour at a position, holding the end colours beyond the last
 * stop — the ring is cut at twelve o'clock, so there is nothing to wrap into.
 */
export function sampleRamp(stops: readonly RampStop[], at: number): string {
  if (stops.length === 0) return '#000000';
  if (at <= stops[0].at) return stops[0].color;
  const last = stops[stops.length - 1];
  if (at >= last.at) return last.color;
  for (let i = 1; i < stops.length; i += 1) {
    const previous = stops[i - 1];
    const next = stops[i];
    if (at > next.at) continue;
    const span = next.at - previous.at;
    if (span <= 0) return next.color;
    return mixHex(previous.color, next.color, (at - previous.at) / span);
  }
  return last.color;
}
