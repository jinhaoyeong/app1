import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { usePathname, useSegments } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { LumaTabBar } from '@/components/TabBar';
import { activeTabKey, isTabRoute } from '@/navigation/tabRoute';

/**
 * Headless tabs. Native: the dock is a sibling overlay inside this screen
 * so react-native-screens cannot paint over it. Web: the dock lives on the
 * root stack (TabDock) and is portaled onto document.body.
 */
export default function TabsLayout() {
  const segments = useSegments();
  const pathname = usePathname();
  const showNativeDock =
    Platform.OS !== 'web' && isTabRoute(segments, pathname);

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
      {showNativeDock ? (
        <LumaTabBar activeKey={activeTabKey(segments, pathname)} />
      ) : null}
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
    height: 0,
    width: 0,
    overflow: 'hidden',
    position: 'absolute',
    opacity: 0,
  },
});
