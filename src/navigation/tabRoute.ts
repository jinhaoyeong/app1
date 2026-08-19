export const TAB_KEYS = ['today', 'calendar', 'insights', 'you'] as const;

export type TabKey = (typeof TAB_KEYS)[number];

/**
 * Extra air above the iPhone home bar on stack sheets (log, day, settings).
 * Web zeros the safe-area bottom inset so the floating dock is not lifted
 * by a painted slab; stack screens still need that strip once the dock is
 * hidden.
 */
export const WEB_STACK_BOTTOM_INSET = 28;

export function isTabKey(value: string): value is TabKey {
  return (TAB_KEYS as readonly string[]).includes(value);
}

/**
 * True only when the focused route is one of the four tabs.
 * Log, day, settings, and onboarding must not count — that is what left
 * the dock sitting on top of those pages and stealing their touches.
 */
export function isTabRoute(
  segments: readonly string[],
  pathname = '',
): boolean {
  if (segments[0] === '(tabs)') return true;
  const path = pathname.split('?')[0];
  if (
    TAB_KEYS.some((key) => path === `/${key}` || path.startsWith(`/${key}/`))
  ) {
    return true;
  }
  const leaf = segments.filter((segment) => !segment.startsWith('('));
  return leaf.length === 1 && isTabKey(leaf[0] ?? '');
}

export function activeTabKey(
  segments: readonly string[],
  pathname = '',
): TabKey {
  const fromSegments = TAB_KEYS.find((key) => segments.includes(key));
  if (fromSegments) return fromSegments;
  const path = pathname.split('?')[0];
  return (
    TAB_KEYS.find((key) => path === `/${key}` || path.startsWith(`/${key}/`)) ??
    'today'
  );
}

export function stackBottomInset(safeBottom: number, isWeb: boolean): number {
  return isWeb ? Math.max(safeBottom, WEB_STACK_BOTTOM_INSET) : safeBottom;
}
