import { darkColors, lightColors } from '../src/theme/palette';

/**
 * The ring is one red.
 *
 * It took three attempts to land here, and the two wrong ones are worth
 * writing down. First the arcs were drawn from the selected accent, so on Dust
 * Rose the whole ring was three shades of the same pink. Over-correcting, the
 * phases were then spread around the hue wheel — ochre, teal, indigo — which
 * separated them perfectly and looked like a chart of something rather than a
 * period tracker.
 *
 * So phases are told apart by **depth within the period's own family**. That
 * inverts what this file used to assert: hues must now stay *close*, and the
 * work of distinguishing a phase is done by lightness, by the notch at each
 * boundary, and by the phase being named in the middle of the ring.
 *
 * What has to hold:
 *
 * - the ring travels — its deepest and palest tones are far apart
 * - nothing on it disappears into the page
 * - it stays one family, so it still reads as blood rather than as a spectrum
 * - no tone goes chalky, which is what killed the plain-RGB ramp
 * - the seam is visible, so a restarting cycle is not hidden
 */

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
}

function linear(hex: string): Rgb {
  return toRgb(hex).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as Rgb;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = linear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/** OKLab: the only space in which "is this still colourful" survives a
 *  comparison across lightness. */
function oklab(hex: string): { a: number; b: number } {
  const [r, g, b] = linear(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function chroma(hex: string): number {
  const { a, b } = oklab(hex);
  return Math.hypot(a, b);
}

function hue(hex: string): number {
  const { a, b } = oklab(hex);
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
}

const themes = [
  { name: 'light', colors: lightColors },
  { name: 'dark', colors: darkColors },
] as const;

const ring = ['menstrual', 'follicular', 'fertile', 'luteal'] as const;

const softOf = {
  menstrual: 'menstrualSoft',
  follicular: 'follicularSoft',
  fertile: 'fertileSoft',
  luteal: 'lutealSoft',
} as const;

describe('phase palette', () => {
  describe.each(themes)('$name', ({ colors }) => {
    const hues = colors.phases;
    const tones = ring.flatMap((phase) => [hues[phase], hues[softOf[phase]]]);

    it('keeps every tone off the page rather than sunk into it', () => {
      for (const tone of tones) {
        expect(contrast(tone, colors.background)).toBeGreaterThanOrEqual(1.9);
      }
    });

    it('anchors the ring with a tone that is unmistakably present', () => {
      const deepest = Math.max(
        ...tones.map((tone) => contrast(tone, colors.background)),
      );
      expect(deepest).toBeGreaterThanOrEqual(3);
    });

    /**
     * Depth is doing the work hue used to, so the ring has to actually travel.
     * Without this the whole thing collapses back to one flat tone.
     */
    it('travels from its deepest tone to its palest', () => {
      const byLuminance = [...tones].sort(
        (a, b) => relativeLuminance(a) - relativeLuminance(b),
      );
      expect(
        contrast(byLuminance[0], byLuminance[byLuminance.length - 1]),
      ).toBeGreaterThanOrEqual(3);
    });

    /** The point of the revision: this is a period tracker, so it is red. */
    it('stays inside one hue family', () => {
      const hueValues = tones.map(hue);
      expect(
        Math.max(...hueValues) - Math.min(...hueValues),
      ).toBeLessThanOrEqual(25);
    });

    /**
     * Interpolating toward a pale colour in plain RGB drops chroma to about
     * 0.06 and turns the light end to dusty brown. The ramp is built in OKLCH
     * precisely to avoid that, and this is what says so.
     */
    it('never lets a tone go chalky', () => {
      for (const tone of tones) {
        expect(chroma(tone)).toBeGreaterThanOrEqual(0.085);
      }
    });

    it('keeps each phase lighter at its soft end', () => {
      for (const phase of ring) {
        expect(relativeLuminance(hues[softOf[phase]])).toBeGreaterThan(
          relativeLuminance(hues[phase]),
        );
      }
    });

    /**
     * The last day sits against the first. The seam is a double-width gap so
     * the two never actually touch, but they still have to look different or
     * a restarting cycle is invisible.
     */
    it('shows where the cycle restarts', () => {
      expect(contrast(hues.luteal, hues.menstrual)).toBeGreaterThanOrEqual(1.4);
    });
  });
});
