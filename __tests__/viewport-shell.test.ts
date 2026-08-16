import { largestWindowHeight } from '@/web/viewportLock';

describe('largestWindowHeight', () => {
  it('fills the iPhone layout canvas instead of the short visual viewport', () => {
    // innerHeight 650 (toolbar showing), layout 780, visual 650.
    expect(largestWindowHeight(650, 780, 650)).toBe(780);
  });

  it('grows with the visual viewport when the Safari bar hides', () => {
    // Stale innerHeight 650, layout 780, visual now 780.
    expect(largestWindowHeight(650, 780, 844)).toBe(844);
  });

  it('does not shrink to the visual viewport when it is the smallest number', () => {
    expect(largestWindowHeight(800, 800, 640)).toBe(800);
  });

  it('ignores non-finite values', () => {
    expect(largestWindowHeight(Number.NaN, 700, Number.POSITIVE_INFINITY)).toBe(
      700,
    );
  });
});
