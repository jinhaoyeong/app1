import { useEffect } from 'react';
import { Platform } from 'react-native';
import { applySafariViewportMeta, LUMA_VIEWPORT_CSS } from '@/web/viewportLock';

const STYLE_ID = 'luma-ios-viewport';

/** Pins the web shell to the visible iPhone window after hydration. */
export function WebViewportLock() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = LUMA_VIEWPORT_CSS;
      document.head.appendChild(style);
    }

    applySafariViewportMeta();
  }, []);

  return null;
}
