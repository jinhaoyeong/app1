import { useEffect } from 'react';
import { Platform } from 'react-native';
import {
  applySafariViewportMeta,
  ensureDockHost,
  LUMA_VIEWPORT_CSS,
  releaseLumaShellHeight,
} from '@/web/viewportLock';

const STYLE_ID = 'luma-ios-viewport';

/**
 * Always write the current CSS from this JS bundle. Safari/PWA often keep a
 * cached index.html whose <style id="luma-ios-viewport"> would otherwise
 * freeze an old slab in place while the JS updates.
 */
export function WebViewportLock() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = LUMA_VIEWPORT_CSS;

    applySafariViewportMeta();
    releaseLumaShellHeight();
    ensureDockHost();

    const onResize = () => {
      releaseLumaShellHeight();
    };
    window.addEventListener('orientationchange', onResize);

    return () => {
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return null;
}
