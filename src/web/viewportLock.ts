/**
 * Real iPhone Safari (not Chrome device mode) has two viewports. `height: 100%`
 * / `100vh` / `visualViewport.height` can resolve to the *large* layout size
 * or to a *shorter* visible size. Setting an explicit height from JS was
 * shrinking the app and leaving a black slab under the dock.
 *
 * `position: fixed; inset: 0` fills whatever the browser treats as the
 * visible window, without inventing a second height.
 */
export const LUMA_VIEWPORT_CSS = `
html, body {
  position: fixed !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: auto !important;
  max-height: none !important;
  overflow: hidden !important;
  overscroll-behavior: none;
}
#root {
  display: flex !important;
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
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
