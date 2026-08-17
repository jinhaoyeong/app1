/**
 * The iPhone black chunk is empty canvas below the dock: either the shell is
 * shorter than the phone, or the dock is lifted by `env(safe-area-inset-bottom)`.
 *
 * With `viewport-fit=cover` the layout viewport already includes the home
 * indicator. Padding or offsetting by that inset paints a solid charcoal
 * slab and parks the capsule on top of it — exactly the screenshot.
 *
 * html/body/#root fill 100vh with zero bottom padding. The dock host sits
 * 8px from that physical bottom. Never `visualViewport` height, never
 * `100svh`/`100dvh`/`100lvh`, never safe-area on the dock.
 *
 * `WebViewportLock` always overwrites this CSS from the JS bundle so a
 * cached index.html cannot keep an old slab.
 */

export const LUMA_DOCK_HOST_ID = 'luma-dock-host';

export const LUMA_VIEWPORT_CSS = `
html, body {
  margin: 0 !important;
  padding: 0 !important;
  padding-bottom: 0 !important;
  width: 100% !important;
  min-width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  min-height: 100vh !important;
  overflow: hidden !important;
  overscroll-behavior: none;
  position: relative !important;
  inset: auto !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: auto !important;
}
#root {
  position: absolute !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 !important;
  padding-bottom: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}
#root > div {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  padding-bottom: 0 !important;
}
#${LUMA_DOCK_HOST_ID} {
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  top: auto !important;
  bottom: 8px !important;
  width: 100% !important;
  height: auto !important;
  max-height: none !important;
  margin: 0 !important;
  margin-bottom: 0 !important;
  padding: 0 !important;
  padding-bottom: 0 !important;
  background: transparent !important;
  background-color: transparent !important;
  pointer-events: none !important;
  z-index: 2147483647 !important;
  transform: none !important;
  filter: none !important;
  contain: none !important;
}
#${LUMA_DOCK_HOST_ID} > * {
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

function clearInlineSize(el: HTMLElement | null) {
  if (!el) return;
  el.style.removeProperty('height');
  el.style.removeProperty('min-height');
  el.style.removeProperty('max-height');
}

/**
 * Drop pixel heights from earlier deploys. Those locked the shell to the
 * short iPhone window and left the home-indicator strip as a black slab.
 */
export function releaseLumaShellHeight() {
  if (typeof document === 'undefined') return;
  clearInlineSize(document.documentElement);
  clearInlineSize(document.body);
  clearInlineSize(document.getElementById('root'));
}

export function ensureDockHost(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let host = document.getElementById(LUMA_DOCK_HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = LUMA_DOCK_HOST_ID;
    document.body.appendChild(host);
  } else if (host.parentElement !== document.body) {
    document.body.appendChild(host);
  }
  host.classList.remove('luma-standalone');
  return host;
}
