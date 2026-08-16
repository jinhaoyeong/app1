/**
 * Real iPhone Safari has a layout viewport (full canvas, including the
 * region behind the toolbar / home indicator) and a visual viewport (what
 * is not covered by Safari chrome).
 *
 * Sizing the app to `visualViewport.height` (or `100svh` / `100dvh`) leaves
 * a dark slab between the dock and the home indicator — the bug on a real
 * iPhone that Chrome device-mode never shows. `env(safe-area-inset-bottom)`
 * on top of that double-counts chrome (~80–120px) and parks the dock on
 * the slab.
 *
 * Shell height is the *largest* of innerHeight, document clientHeight, and
 * the visual viewport — never the visual height alone. The dock is a
 * `document.body` host (`#luma-dock-host`) so RN-web transforms cannot trap
 * `position: fixed`.
 *
 * Browser: 8px from the canvas bottom, no env(safe-area). Home-screen PWA:
 * lift by at most the 34px home indicator.
 *
 * `WebViewportLock` always overwrites this CSS from the JS bundle so a
 * cached index.html cannot keep an old slab.
 */

export const LUMA_DOCK_HOST_ID = 'luma-dock-host';

export const LUMA_VIEWPORT_CSS = `
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  min-width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  min-height: 100lvh !important;
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
  left: 0 !important;
  right: 0 !important;
  bottom: auto !important;
  width: 100% !important;
  min-width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  min-height: 100lvh !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  max-height: none !important;
}
#root > div {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
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
  padding: 0 !important;
  background: transparent !important;
  pointer-events: none !important;
  z-index: 2147483647 !important;
  transform: none !important;
  filter: none !important;
  contain: none !important;
}
@media (display-mode: standalone) {
  #${LUMA_DOCK_HOST_ID} {
    bottom: max(8px, min(34px, env(safe-area-inset-bottom, 0px))) !important;
  }
}
#${LUMA_DOCK_HOST_ID}.luma-standalone {
  bottom: max(8px, min(34px, env(safe-area-inset-bottom, 0px))) !important;
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

export function isStandaloneWebApp() {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const ios = (window.navigator as Navigator & { standalone?: boolean })
    .standalone;
  return Boolean(media || ios);
}

/**
 * Fill the iPhone canvas, including the region Chrome device-mode pretends
 * does not exist. Never return the visual viewport height by itself — that
 * is the black chunk.
 */
function saneHeight(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function largestWindowHeight(
  innerHeight: number,
  clientHeight: number,
  visualBottom = 0,
): number {
  return Math.max(
    saneHeight(innerHeight),
    saneHeight(clientHeight),
    saneHeight(visualBottom),
  );
}

export function applyLumaShellLayout() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const vv = window.visualViewport;
  const visualBottom = vv ? vv.height + vv.offsetTop : 0;
  const height = largestWindowHeight(
    window.innerHeight,
    document.documentElement.clientHeight,
    visualBottom,
  );
  if (height < 1) return;

  const px = `${Math.round(height)}px`;
  const html = document.documentElement;
  const body = document.body;
  const root = document.getElementById('root');

  html.style.setProperty('height', px, 'important');
  html.style.setProperty('min-height', px, 'important');
  html.style.setProperty('max-height', 'none', 'important');
  body.style.setProperty('height', px, 'important');
  body.style.setProperty('min-height', px, 'important');
  body.style.setProperty('max-height', 'none', 'important');
  body.style.setProperty('position', 'relative', 'important');

  if (root) {
    root.style.setProperty('height', px, 'important');
    root.style.setProperty('min-height', px, 'important');
    root.style.setProperty('max-height', 'none', 'important');
  }

  const host = document.getElementById(LUMA_DOCK_HOST_ID);
  if (host) {
    host.classList.toggle('luma-standalone', isStandaloneWebApp());
  }
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
  host.classList.toggle('luma-standalone', isStandaloneWebApp());
  return host;
}
