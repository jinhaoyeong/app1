import { useMemo, type ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { WEB_SCREEN_TOP_INSET_FLOOR } from '@/navigation/tabRoute';

/**
 * On web the home indicator overlays the canvas (`viewport-fit=cover`).
 * Feeding that inset back in as padding paints the charcoal slab under
 * the dock. Native keeps the real bottom inset.
 *
 * Top is the opposite problem: the library often reports 0, so we floor
 * to the Dynamic Island height and let screens add their own extra air.
 */
export function WebEdgeToEdgeInsets({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const value = useMemo(
    () => ({
      ...insets,
      top:
        Platform.OS === 'web'
          ? Math.max(insets.top, WEB_SCREEN_TOP_INSET_FLOOR)
          : insets.top,
      bottom: Platform.OS === 'web' ? 0 : insets.bottom,
    }),
    [insets],
  );

  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <SafeAreaInsetsContext.Provider value={value}>
      {children}
    </SafeAreaInsetsContext.Provider>
  );
}
