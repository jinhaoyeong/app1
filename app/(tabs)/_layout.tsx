import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';

/**
 * Headless tabs. The floating dock lives on the root stack so a frozen
 * or duplicated tabs layout cannot mount a second copy. The React
 * Navigation bottom tab bar is never mounted.
 */
export default function TabsLayout() {
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
