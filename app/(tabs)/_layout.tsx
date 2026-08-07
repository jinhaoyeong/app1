import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/tokens';

function TabLabel({
  label,
  focused,
}: {
  label: string;
  focused: boolean;
}) {
  const { colors, accent } = useTheme();
  return (
    <Text
      style={[
        typography.caption,
        {
          color: focused ? accent : colors.textTertiary,
          fontWeight: focused ? '600' : '400',
          marginTop: 2,
        },
      ]}
    >
      {label}
    </Text>
  );
}

function LogFab() {
  const router = useRouter();
  const { accent } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Log today"
      onPress={() => router.push('/log')}
      style={[
        styles.fab,
        {
          backgroundColor: accent,
          bottom: insets.bottom + 64,
        },
      ]}
    >
      <Text style={styles.fabText}>+</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textTertiary,
        }}
      >
        <Tabs.Screen
          name="today"
          options={{
            title: 'Today',
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Today" focused={focused} />
            ),
            tabBarIcon: () => null,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Calendar" focused={focused} />
            ),
            tabBarIcon: () => null,
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: 'Insights',
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Insights" focused={focused} />
            ),
            tabBarIcon: () => null,
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: 'You',
            tabBarLabel: ({ focused }) => (
              <TabLabel label="You" focused={focused} />
            ),
            tabBarIcon: () => null,
          }}
        />
      </Tabs>
      <LogFab />
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '400',
    marginTop: -2,
  },
});
