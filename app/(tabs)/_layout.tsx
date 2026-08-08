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
        screenOptions={{
          headerShown: false,
          // Navigation is drawn by LumaTabBar so the dock can float over content.
          tabBarStyle: { display: 'none' },
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
