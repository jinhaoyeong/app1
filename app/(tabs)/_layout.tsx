import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSegments } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { LumaTabBar } from '@/components/TabBar';

const TAB_KEYS = ['today', 'calendar', 'insights', 'you'] as const;

/**
 * Headless tabs. The React Navigation bottom tab bar is never mounted, and
 * the floating dock is a sibling overlay — not a flex footer — so it cannot
 * open a painted slab under Today.
 */
export default function TabsLayout() {
  const segments = useSegments();
  const activeKey =
    TAB_KEYS.find((key) => segments.includes(key as never)) ?? 'today';

  return (
    <View style={styles.shell} pointerEvents="box-none">
      <Tabs style={styles.root}>
        <TabSlot style={styles.slot} />
        <TabList style={styles.hiddenList}>
          <TabTrigger name="today" href="/(tabs)/today" />
          <TabTrigger name="calendar" href="/(tabs)/calendar" />
          <TabTrigger name="insights" href="/(tabs)/insights" />
          <TabTrigger name="you" href="/(tabs)/you" />
        </TabList>
      </Tabs>
      <LumaTabBar activeKey={activeKey} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
  slot: {
    flex: 1,
    minHeight: 0,
  },
  hiddenList: {
    display: 'none',
  },
});
