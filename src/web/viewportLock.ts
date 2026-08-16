/**
 * Real iPhone Safari (not Chrome device mode) has two viewports.
 *
 * The tab ScrollViews must be as tall as the *visible* window (`100dvh`).
 * `100lvh` / `position: fixed; inset: 0` both fail in opposite ways:
 * a large-viewport shell hides the last lines behind the dock (padding
 * lands off-screen); a visual-viewport-fixed shell leaves a canvas slab
 * under the dock.
 *
 * Never set a JS height from `visualViewport` — that shrinks the app.
 * The dock is a separate `position: fixed` cluster and must not paint a
 * full-width footer. Tab screens add `TabDockClearance` so the last line
 * can scroll fully above the capsule.
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
  height: 100dvh !important;
  max-height: 100dvh !important;
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
  height: 100dvh !important;
  max-height: 100dvh !important;
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
