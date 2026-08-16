import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { PressableScale } from '@/components/motion';
import { motion, radii, softShadow, spacing, typography } from '@/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type TabItem = {
  key: string;
  label: string;
  href: string;
  icon: IconName;
  activeIcon: IconName;
};

type Slot = { x: number; width: number };

export const TAB_DOCK_HEIGHT = 64;
const TAB_DOCK_GAP = 12;
const TAB_DOCK_BREATHING = 24;

/** Space so the last line of a tab can scroll fully above the floating dock. */
export function tabScrollInset(safeBottom: number) {
  return (
    TAB_DOCK_HEIGHT + Math.max(safeBottom, TAB_DOCK_GAP) + TAB_DOCK_BREATHING
  );
}

/**
 * Invisible spacer at the end of each tab ScrollView. On web it uses the
 * same `env(safe-area-inset-bottom)` as the dock, so iPhone Safari cannot
 * report a 0 inset and leave the last row behind the capsule.
 */
export function TabDockClearance() {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={
        Platform.OS === 'web'
          ? {
              height:
                `calc(${TAB_DOCK_HEIGHT}px + max(${TAB_DOCK_GAP}px, env(safe-area-inset-bottom, 0px)) + ${TAB_DOCK_BREATHING}px)` as never,
            }
          : { height: tabScrollInset(insets.bottom) }
      }
    />
  );
}

const TABS: TabItem[] = [
  {
    key: 'today',
    label: 'Today',
    href: '/(tabs)/today',
    icon: 'ellipse-outline',
    activeIcon: 'ellipse',
  },
  {
    key: 'calendar',
    label: 'Calendar',
    href: '/(tabs)/calendar',
    icon: 'grid-outline',
    activeIcon: 'grid',
  },
  {
    key: 'insights',
    label: 'Insights',
    href: '/(tabs)/insights',
    icon: 'pulse-outline',
    activeIcon: 'pulse',
  },
  {
    key: 'you',
    label: 'You',
    href: '/(tabs)/you',
    icon: 'person-outline',
    activeIcon: 'person',
  },
];

/**
 * A floating tab cluster: a capsule of four destinations with a tinted pill
 * that springs to the active tab, plus the single Log action set apart in the
 * accent colour so it never competes with navigation.
 */
export function LumaTabBar({ activeKey }: { activeKey: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, tint } = useTheme();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [slots, setSlots] = useState<Record<string, Slot>>({});
  // A 320pt phone leaves ~53pt per tab; "CALENDAR" needs the tighter setting.
  const compact = width < 360;

  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);

  // Only record the layout here. Writing shared values inside a state updater
  // runs during render — React may call it twice — which is what produced the
  // Reanimated "write during render" warnings. The effect below owns the pill.
  const measure = (key: string, slot: Slot) => {
    if (!Number.isFinite(slot.x) || !Number.isFinite(slot.width)) return;
    setSlots((prev) =>
      prev[key]?.x === slot.x && prev[key]?.width === slot.width
        ? prev
        : { ...prev, [key]: slot },
    );
  };

  React.useEffect(() => {
    const active = slots[activeKey];
    if (!active) return;
    pillX.value = reduced ? active.x : withSpring(active.x, motion.spring);
    pillW.value = reduced
      ? active.width
      : withSpring(active.width, motion.spring);
  }, [activeKey, slots, pillX, pillW, reduced]);

  const pillStyle = useAnimatedStyle(() => ({
    left: pillX.value,
    width: pillW.value,
  }));

  const go = async (item: TabItem) => {
    if (item.key !== activeKey) {
      try {
        await Haptics.selectionAsync();
      } catch {
        // web / unsupported
      }
    }
    router.navigate(item.href as never);
  };

  const openLog = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // web / unsupported
    }
    router.push('/log');
  };

  // Hug the cluster. A full-width padded/painted wrapper is the dark block
  // under the capsule. CSS on #luma-floating-dock owns the iPhone offset.
  const dockOffset: ViewStyle =
    Platform.OS === 'web'
      ? {
          position: 'fixed' as never,
          top: 'auto' as never,
          bottom: TAB_DOCK_GAP,
          height: 'auto' as never,
          backgroundColor: 'transparent',
        }
      : { bottom: Math.max(insets.bottom, TAB_DOCK_GAP) };

  return (
    <View
      id="luma-floating-dock"
      pointerEvents="box-none"
      style={[styles.dock, dockOffset]}
    >
      <View style={styles.cluster}>
        <View
          style={[
            styles.capsule,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.borderStrong,
            },
            softShadow(
              isDark ? '#000000' : '#1A1C14',
              isDark ? 0.45 : 0.14,
              20,
            ),
          ]}
        >
          <Animated.View
            style={[
              styles.pill,
              { backgroundColor: tint(isDark ? 0.2 : 0.14) },
              pillStyle,
            ]}
          />
          {TABS.map((item) => {
            const focused = item.key === activeKey;
            return (
              <PressableScale
                key={item.key}
                onPress={() => go(item)}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={item.label}
                scaleTo={0.9}
                dimTo={1}
                onLayout={(e) =>
                  measure(item.key, {
                    x: e.nativeEvent.layout.x,
                    width: e.nativeEvent.layout.width,
                  })
                }
                style={styles.tab}
              >
                <Ionicons
                  name={focused ? item.activeIcon : item.icon}
                  size={19}
                  color={focused ? colors.accent : colors.textTertiary}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    typography.eyebrow,
                    {
                      // Tighter than the display eyebrow so "CALENDAR" still
                      // fits a quarter of the capsule on a small phone.
                      fontSize: compact ? 8.5 : 9,
                      letterSpacing: compact ? 0.2 : 0.7,
                      marginTop: 4,
                      color: focused ? colors.accent : colors.textTertiary,
                    },
                  ]}
                >
                  {item.label.toUpperCase()}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <PressableScale
          onPress={openLog}
          accessibilityRole="button"
          accessibilityLabel="Log today"
          scaleTo={0.9}
          style={[
            styles.logButton,
            { backgroundColor: colors.accent },
            softShadow(colors.accent, isDark ? 0.4 : 0.32, 18),
          ]}
        >
          <Ionicons name="add" size={26} color={colors.accentInk} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: 0,
    zIndex: 50,
    backgroundColor: 'transparent',
    // The dock spans the full width; only its children may take touches, or
    // it would swallow taps on the content scrolling beneath it.
    pointerEvents: 'box-none',
  },
  cluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    maxWidth: 460,
  },
  capsule: {
    flex: 1,
    height: 64,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  pill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: radii.full,
    pointerEvents: 'none',
  },
  tab: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButton: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
