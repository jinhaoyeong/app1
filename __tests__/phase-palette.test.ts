import { darkColors, lightColors } from '../src/theme/palette';

/**
 * The dial's arcs used to be drawn from the selected accent, which meant the
 * whole ring landed in one hue family and "Earlier cycle" was indistinguishable
 * from the bleeding block. These two rules are what stop that coming back:
 * every arc has to be visible against its own ground, and phases that touch
 * each other on the ring have to be different colours, not different shades.
 */

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

function hue(hex: string): number {
  const [r, g, b] = toRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const sector =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return (sector * 60 + 360) % 360;
}

function hueGap(a: string, b: string): number {
  const d = Math.abs(hue(a) - hue(b)) % 360;
  return d > 180 ? 360 - d : d;
}

const themes = [
  { name: 'light', colors: lightColors },
  { name: 'dark', colors: darkColors },
] as const;

describe('phase palette', () => {
  /**
   * WCAG 1.4.11: a graphical object you need in order to read the screen
   * carries 3:1. The arcs are the content of the dial, so both ends of every
   * phase gradient have to clear it — not just the deep end.
   */
  describe.each(themes)('$name', ({ colors }) => {
    it.each(Object.entries(colors.phases))(
      '%s stays visible against the ground',
      (_tone, value) => {
        expect(contrast(value, colors.background)).toBeGreaterThanOrEqual(3);
      },
    );

    it('gives every phase its own hue rather than its own shade', () => {
      // In ring order, including the wrap where the last day sits against the
      // first — that seam is where the old palette hid a restarting cycle.
      const ring = ['menstrual', 'follicular', 'fertile', 'luteal'] as const;
      ring.forEach((key, i) => {
        const next = ring[(i + 1) % ring.length];
        expect(hueGap(colors.phases[key], colors.phases[next])).toBeGreaterThan(
          25,
        );
      });
    });

    it('keeps each phase lighter at its soft end, so arcs blend outward', () => {
      const pairs = [
        ['menstrual', 'menstrualSoft'],
        ['follicular', 'follicularSoft'],
        ['fertile', 'fertileSoft'],
        ['luteal', 'lutealSoft'],
      ] as const;
      for (const [deep, soft] of pairs) {
        const deepLuminance = relativeLuminance(colors.phases[deep]);
        const softLuminance = relativeLuminance(colors.phases[soft]);
        expect(softLuminance).toBeGreaterThan(deepLuminance);
      }
    });
  });

  it('does not reuse the period tone for another phase', () => {
    for (const { colors } of themes) {
      const { menstrual, menstrualSoft, follicular, fertile, luteal } =
        colors.phases;
      for (const other of [follicular, fertile, luteal]) {
        expect(hueGap(menstrual, other)).toBeGreaterThan(25);
        expect(hueGap(menstrualSoft, other)).toBeGreaterThan(25);
      }
    }
  });
});
