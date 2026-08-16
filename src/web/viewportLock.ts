/**
 * iOS Safari uses a large layout viewport (100% / 100vh) that is taller than
 * the visible screen while the toolbar is showing. Chrome device mode does
 * not. Pinning the shell to the visual viewport removes the empty slab under
 * the floating dock.
 */
export const LUMA_VIEWPORT_CSS = `
html, body {
  position: fixed;
  inset: 0;
  width: 100%;
  max-width: 100%;
  height: 100%;
  height: 100dvh;
  height: -webkit-fill-available;
  height: var(--luma-vh, 100dvh);
  overflow: hidden;
  overscroll-behavior: none;
}
#root {
  display: flex;
  width: 100%;
  height: 100%;
}
`.trim();

export const LUMA_VIEWPORT_SCRIPT = `
(function () {
  function syncLumaViewport() {
    var viewport = window.visualViewport;
    var height = viewport && viewport.height ? viewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--luma-vh', height + 'px');
  }
  syncLumaViewport();
  window.addEventListener('resize', syncLumaViewport);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncLumaViewport);
    window.visualViewport.addEventListener('scroll', syncLumaViewport);
  }
})();
`.trim();

export function syncLumaViewport() {
  if (typeof window === 'undefined') return;
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--luma-vh', `${height}px`);
}
