/**
 * Colour data only — no react-native import, so the palette rules can be
 * asserted in plain unit tests. Everything else about the theme lives in
 * `tokens.ts`, which re-exports these.
 */

/** Warm paper, not cool grey — the ground of a printed page. */
export const lightColors = {
  background: '#F7F2EB',
  surface: '#FDFAF6',
  surfaceMuted: '#EDE5D9',
  surfaceRaised: '#FFFFFF',
  text: '#1E1815',
  textSecondary: '#5C534C',
  textTertiary: '#877C73',
  border: '#E2D9CC',
  borderStrong: '#C8BCAC',
  period: '#AF4A40',
  /**
   * A deeper period tone reserved for large filled shapes like the ribbon.
   * Kept separate from `period` because that one has to stay legible as small
   * text, which caps how dark it can go.
   */
  periodDeep: '#8C3630',
  periodInk: '#FFFFFF',
  predicted: '#6A7590',
  fertile: '#4E7A5E',
  warningSoft: '#8F6528',
  successSoft: '#5F7A4A',
  /**
   * Phase colour is semantic and fixed — it is never the selected accent.
   *
   * The dial used to draw its arcs from the accent pair, which is exactly why
   * the ring read as a single colour: Dust Rose sits a few degrees off the
   * period tone, so "Earlier cycle" and "Later cycle" dissolved into the
   * bleeding block. These four pigments are far enough apart in hue to be
   * told apart at a glance and still nowhere near neon — terracotta, ochre,
   * weathered teal, dried violet. The accent goes back to what DESIGN.md
   * always said it was for: actions, marks, and washes.
   *
   * Each phase ships deep and soft so an arc can blend along its own length
   * instead of sitting flat, the way the accent pair used to.
   */
  phases: {
    menstrual: '#8C3630',
    menstrualSoft: '#AF4A40',
    follicular: '#856739',
    follicularSoft: '#A78148',
    fertile: '#467672',
    fertileSoft: '#57938E',
    luteal: '#6B5081',
    lutealSoft: '#93739F',
  },
  overlay: 'rgba(30, 24, 21, 0.44)',
};

/**
 * Warm charcoal, not black.
 *
 * The previous ink was `#0C0D0A` — effectively pure black with a green cast,
 * which is what made the app read as a terminal. Lifting it and pushing the
 * hue warm turns the same layout into low lamplight.
 */
export const darkColors = {
  background: '#16120F',
  surface: '#1E1916',
  surfaceMuted: '#29221E',
  surfaceRaised: '#332B26',
  text: '#F4EDE6',
  textSecondary: '#B5AAA1',
  textTertiary: '#8B8078',
  border: '#332B26',
  borderStrong: '#463C35',
  period: '#DE8A7C',
  periodDeep: '#A85043',
  periodInk: '#1B1210',
  predicted: '#A9B3C9',
  fertile: '#8FB69C',
  warningSoft: '#D9AC76',
  successSoft: '#A9BE96',
  /** Same four pigments, lifted and softened for the ink ground. */
  phases: {
    menstrual: '#A85043',
    menstrualSoft: '#DE8A7C',
    follicular: '#C79552',
    follicularSoft: '#E8C58A',
    fertile: '#4E8E88',
    fertileSoft: '#8CC2BC',
    luteal: '#8467A0',
    lutealSoft: '#BFA3CE',
  },
  overlay: 'rgba(0, 0, 0, 0.66)',
};
