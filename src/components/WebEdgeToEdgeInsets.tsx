import { useMemo, type ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

/**
 * On web the home indicator overlays the canvas (`viewport-fit=cover`).
 * Feeding that inset back in as padding paints the charcoal slab under
 * the dock. Native keeps the real bottom inset.
 */
export function WebEdgeToEdgeInsets({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const value = useMemo(
    () => ({ ...insets, bottom: Platform.OS === 'web' ? 0 : insets.bottom }),
    [insets],
  );

  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <SafeAreaInsetsContext.Provider value={value}>
      {children}
    </SafeAreaInsetsContext.Provider>
  );
}
