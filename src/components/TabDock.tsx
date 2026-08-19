import React from 'react';
import { Platform } from 'react-native';
import { usePathname, useSegments } from 'expo-router';
import { LumaTabBar } from '@/components/TabBar';
import { activeTabKey, isTabRoute } from '@/navigation/tabRoute';

/**
 * Web-only dock. Native mounts LumaTabBar inside the tabs screen so the
 * native stack cannot cover it. Hide it whenever the URL is not a tab —
 * that is what left the portal sitting on the log sheet.
 *
 * Do not use `useRootNavigationState()` here. This component is a sibling
 * of the Stack, so the focused root route name is not `(tabs)` on Today.
 */
export function TabDock() {
  const segments = useSegments();
  const pathname = usePathname();
  if (Platform.OS !== 'web') return null;
  if (!isTabRoute(segments, pathname)) return null;
  return <LumaTabBar activeKey={activeTabKey(segments, pathname)} />;
}
