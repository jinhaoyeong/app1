import React from 'react';
import { StyleSheet } from 'react-native';
import { useSegments } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { LumaTabBar } from '@/components/TabBar';

const TAB_KEYS = ['today', 'calendar', 'insights', 'you'] as const;

/**
 * Headless tabs. The React Navigation bottom tab bar is never mounted, so iOS
 * cannot leave a translucent slab under the floating dock.
 */
export default function TabsLayout() {
  const segments = useSegments();
  const activeKey =
    TAB_KEYS.find((key) => segments.includes(key as never)) ?? 'today';

  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList style={styles.hiddenList}>
        <TabTrigger name="today" href="/(tabs)/today" />
        <TabTrigger name="calendar" href="/(tabs)/calendar" />
        <TabTrigger name="insights" href="/(tabs)/insights" />
        <TabTrigger name="you" href="/(tabs)/you" />
      </TabList>
      <LumaTabBar activeKey={activeKey} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  slot: {
    flex: 1,
    minHeight: 0,
  },
  hiddenList: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
});
