/**
 * iOS Safari (including Add to Home Screen) has no Vibration API.
 * Touch detection has to come from the UA, not from Platform.OS — Expo web
 * always reports `web`, even when the page is running as a standalone app.
 */
export function isIosWebFromHints(input: {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
}): boolean {
  const ua = input.userAgent;
  if (/iP(hone|ad|od)/.test(ua)) return true;
  // iPadOS can send a desktop Safari UA; the touch count is the tell.
  if (input.platform === 'MacIntel' && (input.maxTouchPoints ?? 0) > 1) {
    return true;
  }
  return false;
}
