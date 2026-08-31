import { lightColors } from '../src/theme/palette';
import {
  buildPhaseRamp,
  mixHex,
  phasePigment,
  sampleRamp,
  type RampPhase,
} from '../src/theme/phaseColors';

/**
 * The ring is one continuous band now. These cover the arithmetic that makes
 * it continuous: a phase keeps its own colour across the middle of its span,
 * and the ground between two phases is a blend rather than an edge.
 */

const phases: RampPhase[] = [
  { start: 1, end: 5, from: '#8C3630', to: '#AF4A40' },
  { start: 6, end: 18, from: '#A78148', to: '#856739' },
  { start: 19, end: 28, from: '#6B5081', to: '#93739F' },
];

describe('mixHex', () => {
  it('returns the endpoints untouched', () => {
    expect(mixHex('#8C3630', '#93739F', 0)).toBe('#8c3630');
    expect(mixHex('#8C3630', '#93739F', 1)).toBe('#93739f');
  });

  it('clamps past either end rather than extrapolating', () => {
    expect(mixHex('#000000', '#ffffff', -3)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 4)).toBe('#ffffff');
  });

  it('lands halfway at the midpoint', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('buildPhaseRamp', () => {
  it('gives every phase two stops, in order along the cycle', () => {
    const stops = buildPhaseRamp(phases);
    expect(stops).toHaveLength(6);
    const positions = stops.map((s) => s.at);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('insets both stops inside the phase that owns them', () => {
    const stops = buildPhaseRamp(phases);
    phases.forEach((phase, i) => {
      const head = phase.start - 1;
      expect(stops[i * 2].at).toBeGreaterThan(head);
      expect(stops[i * 2 + 1].at).toBeLessThan(phase.end);
    });
  });

  it('keeps a one-day phase from being swallowed by its neighbours', () => {
    const stops = buildPhaseRamp([
      { start: 1, end: 1, from: '#8C3630', to: '#AF4A40' },
    ]);
    expect(stops).toHaveLength(2);
    expect(stops[0].at).toBeLessThan(stops[1].at);
    expect(stops[0].at).toBeGreaterThan(0);
    expect(stops[1].at).toBeLessThan(1);
  });

  it('drops a phase that ends before it starts', () => {
    expect(
      buildPhaseRamp([{ start: 6, end: 4, from: '#000', to: '#fff' }]),
    ).toEqual([]);
  });
});

describe('sampleRamp', () => {
  const stops = buildPhaseRamp(phases);

  it('holds the end colours past the last stop, since the ring is cut at day one', () => {
    expect(sampleRamp(stops, -5)).toBe(stops[0].color);
    expect(sampleRamp(stops, 99)).toBe(stops[stops.length - 1].color);
  });

  it('returns a phase its own colour at its own stop', () => {
    expect(sampleRamp(stops, stops[0].at)).toBe(stops[0].color);
    expect(sampleRamp(stops, stops[3].at)).toBe(stops[3].color);
  });

  /**
   * The whole point of the change: at a boundary the colour must be partway
   * between the two phases, not equal to either. A hard cut would show up here
   * as the sample matching one side exactly.
   */
  it('blends across a boundary instead of cutting', () => {
    const boundary = 5; // end of the period phase, start of the next
    const atBoundary = sampleRamp(stops, boundary);
    expect(atBoundary).not.toBe('#af4a40');
    expect(atBoundary).not.toBe('#a78148');

    // And it has to move gradually either side of it, not jump.
    const before = sampleRamp(stops, boundary - 0.5);
    const after = sampleRamp(stops, boundary + 0.5);
    expect(before).not.toBe(after);
    expect(before).not.toBe(atBoundary);
    expect(after).not.toBe(atBoundary);
  });

  it('never jumps more than a few points per step at dial resolution', () => {
    // The band is drawn as short arcs; if one step to the next moved a long
    // way the fade would read as banding rather than as a gradient.
    const steps = 160;
    let previous = sampleRamp(stops, 0);
    for (let i = 1; i <= steps; i += 1) {
      const current = sampleRamp(stops, (i / steps) * 28);
      const delta = [1, 3, 5].reduce((max, offset) => {
        const a = parseInt(previous.slice(offset, offset + 2), 16);
        const b = parseInt(current.slice(offset, offset + 2), 16);
        return Math.max(max, Math.abs(a - b));
      }, 0);
      expect(delta).toBeLessThanOrEqual(12);
      previous = current;
    }
  });
});

describe('phasePigment', () => {
  it('maps each named phase onto its own pair', () => {
    const { phases: hue } = lightColors;
    expect(phasePigment(hue, 'menstrual')).toEqual({
      deep: hue.menstrual,
      soft: hue.menstrualSoft,
    });
    expect(phasePigment(hue, 'ovulation')).toEqual({
      deep: hue.fertile,
      soft: hue.fertileSoft,
    });
    expect(phasePigment(hue, 'luteal')).toEqual({
      deep: hue.luteal,
      soft: hue.lutealSoft,
    });
  });

  /** A cycle we have not learned yet should not be given a confident colour. */
  it('has no pigment for an unknown phase', () => {
    expect(phasePigment(lightColors.phases, 'unknown')).toBeNull();
  });
});
