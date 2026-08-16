/**
 * Real iPhone Safari (not Chrome device mode) has two viewports.
 *
 * Tab ScrollViews must match the *small* visible window (`100svh`). A
 * large-viewport shell (`100lvh`) parks bottom padding off-screen, so the
 * last line stops behind the dock. A visual-viewport-fixed shell
 * (`inset: 0`) leaves a canvas slab under the dock.
 *
 * Never set a JS height from `visualViewport`. Never put CSS `calc()` in a
 * React Native `height` — RN-web can drop it, collapsing clearance to 0.
 * Tab screens use a numeric `TAB_SCROLL_INSET` on the ScrollView.
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
  height: 100svh !important;
  max-height: 100svh !important;
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
  height: 100svh !important;
  max-height: 100svh !important;
  min-height: 0 !important;
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
#luma-dock-clearance {
  width: 100% !important;
  height: 176px !important;
  min-height: 176px !important;
  flex-shrink: 0 !important;
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
