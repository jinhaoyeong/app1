import React from 'react';
import { View } from 'react-native';
import { Tabs, useSegments } from 'expo-router';
import { LumaTabBar } from '@/components/TabBar';

const TAB_KEYS = ['today', 'calendar', 'insights', 'you'];

export default function TabsLayout() {
  const segments = useSegments();
  const activeKey =
    TAB_KEYS.find((key) => segments.includes(key as never)) ?? 'today';

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        // Never mount the system tab bar. On iOS, `tabBarStyle: { display:
        // 'none' }` still paints a translucent block and reserves its height,
        // which lifts the floating dock and covers the lower part of Today.
        tabBar={() => null}
        safeAreaInsets={{ bottom: 0 }}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: 'none',
            height: 0,
            overflow: 'hidden',
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
          },
        }}
      >
        <Tabs.Screen name="today" options={{ title: 'Today' }} />
        <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
        <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
        <Tabs.Screen name="you" options={{ title: 'You' }} />
      </Tabs>
      <LumaTabBar activeKey={activeKey} />
    </View>
  );
}
