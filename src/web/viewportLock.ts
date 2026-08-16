/**
 * Real iPhone Safari (not Chrome device mode) has two viewports.
 *
 * `position: fixed; inset: 0` sizes html/body to the *visual* window. The
 * layout viewport is taller, and nothing inside a visual-viewport-fixed
 * shell can paint that extra strip — so Safari leaves a canvas slab under
 * the dock (the "block of blocker", with the home indicator in it).
 *
 * Never set a JS height from `visualViewport` either: that shrinks the app
 * and opens the same slab.
 *
 * Leave html/body in normal flow at `100lvh` so the shell covers the
 * physical bottom edge. Scroll happens inside React Native ScrollViews.
 * The dock is a separate `position: fixed` cluster and must not paint a
 * full-width footer.
 */
export const LUMA_VIEWPORT_CSS = `
html, body {
  position: relative !important;
  top: 0 !important;
  right: 0 !important;
  left: 0 !important;
  bottom: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: 100% !important;
  height: -webkit-fill-available !important;
  height: 100lvh !important;
  max-height: none !important;
  overflow: hidden !important;
  overscroll-behavior: none;
}
#root {
  display: flex !important;
  flex-direction: column !important;
  position: relative !important;
  inset: auto !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
}
#luma-floating-dock {
  position: fixed !important;
  left: 0 !important;
  right: 0 !important;
  top: auto !important;
  bottom: max(12px, env(safe-area-inset-bottom, 0px)) !important;
  width: 100% !important;
  height: auto !important;
  max-height: 80px !important;
  margin: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  background: transparent !important;
  background-color: rgba(0, 0, 0, 0) !important;
  pointer-events: none !important;
  z-index: 50 !important;
  transform: none !important;
  inset: auto 0 max(12px, env(safe-area-inset-bottom, 0px)) 0 !important;
}
#luma-floating-dock > * {
  pointer-events: auto;
}
`.trim();

export const LUMA_VIEWPORT_SCRIPT = `
(function () {
  var meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  meta.setAttribute(
    'content',
    'width=device-width, initial-scale=1, viewport-fit=cover'
  );
})();
`.trim();

export function applySafariViewportMeta() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  meta.setAttribute(
    'content',
    'width=device-width, initial-scale=1, viewport-fit=cover',
  );
}
