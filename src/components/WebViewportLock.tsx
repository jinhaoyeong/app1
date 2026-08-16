import { useEffect } from 'react';
import { Platform } from 'react-native';
import { LUMA_VIEWPORT_CSS, syncLumaViewport } from '@/web/viewportLock';

const STYLE_ID = 'luma-ios-viewport';

/** Keeps the web shell matched to the visible iOS viewport after hydration. */
export function WebViewportLock() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = LUMA_VIEWPORT_CSS;
      document.head.appendChild(style);
    }

    syncLumaViewport();
    window.addEventListener('resize', syncLumaViewport);
    window.visualViewport?.addEventListener('resize', syncLumaViewport);
    window.visualViewport?.addEventListener('scroll', syncLumaViewport);
    return () => {
      window.removeEventListener('resize', syncLumaViewport);
      window.visualViewport?.removeEventListener('resize', syncLumaViewport);
      window.visualViewport?.removeEventListener('scroll', syncLumaViewport);
    };
  }, []);

  return null;
}
