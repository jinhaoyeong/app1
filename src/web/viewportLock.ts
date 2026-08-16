/**
 * Real iPhone Safari (not Chrome device mode) has two viewports.
 *
 * `100svh` is shorter than the visible window once the URL bar hides, so
 * Safari leaves a black chunk under the dock. `100lvh` is taller, so scroll
 * padding lands off-screen and the last line stops behind the capsule.
 * `100dvh` tracks the window the user can actually see.
 *
 * `env(safe-area-inset-bottom)` can include Safari chrome (~80px+) and
 * lift the dock into a slab. Clamp it to the home-indicator range (12–34).
 *
 * Never set a JS height from `visualViewport`. Tab screens use one numeric
 * `TAB_SCROLL_INSET` — not a second spacer stacked on top of it.
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
  min-height: 0 !important;
}
#luma-floating-dock {
  position: fixed !important;
  left: 0 !important;
  right: 0 !important;
  top: auto !important;
  bottom: clamp(12px, env(safe-area-inset-bottom, 12px), 34px) !important;
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
  inset: auto 0 clamp(12px, env(safe-area-inset-bottom, 12px), 34px) 0 !important;
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
