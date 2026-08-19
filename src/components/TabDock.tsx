import React from 'react';
import { usePathname, useRootNavigationState, useSegments } from 'expo-router';
import { LumaTabBar } from '@/components/TabBar';
import { activeTabKey, isTabRoute } from '@/navigation/tabRoute';

/**
 * The only dock in the tree. Rendered next to the root stack so a frozen
 * or duplicated `(tabs)` layout cannot portal a second copy onto the body.
 * Hidden whenever a stack screen (log, day, settings) is focused, so it
 * cannot steal scrolls or taps from those pages.
 */
export function TabDock() {
  const state = useRootNavigationState();
  const segments = useSegments();
  const pathname = usePathname();
  const rootName = state?.routes?.[state.index ?? 0]?.name;
  const visible =
    rootName != null ? rootName === '(tabs)' : isTabRoute(segments, pathname);

  if (!visible) return null;
  return <LumaTabBar activeKey={activeTabKey(segments, pathname)} />;
}
