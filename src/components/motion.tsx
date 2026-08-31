import React, { useEffect, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';
import { motion } from '@/theme/tokens';
import { attachIosSwitchOverlay, hostElementFromNode } from '@/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Content arrives rather than appears: a short rise and fade, staggered by
 * `index` so a screen reads top-to-bottom. Collapses to an instant show when
 * the user has asked for reduced motion.
 */
export function Reveal({
  children,
  index = 0,
  distance = 14,
  style,
}: {
  children: ReactNode;
  index?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      index * motion.stagger,
      withTiming(1, { duration: motion.base }),
    );
    // Guarantee the resting state even if frame callbacks never arrive — a
    // backgrounded launch or a stalled driver must not leave the screen
    // half-transparent. Assigning the value cancels any running animation.
    const settle = setTimeout(
      () => {
        progress.value = 1;
      },
      index * motion.stagger + motion.base + 400,
    );
    return () => clearTimeout(settle);
  }, [index, progress, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * distance }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

/**
 * The house press feel: a crisp spring down on touch, release on lift. Every
 * tappable surface in Luma uses it so the whole app responds the same way.
 */
export function PressableScale({
  children,
  onPress,
  style,
  scaleTo = 0.97,
  dimTo = 0.92,
  disabled,
  ...rest
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  dimTo?: number;
} & Omit<PressableProps, 'style' | 'onPress' | 'children'>) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const [host, setHost] = useState<unknown>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || disabled) return;
    return attachIosSwitchOverlay(hostElementFromNode(host));
  }, [disabled, host]);

  // The animated opacity is authoritative, so the disabled dim has to live
  // here — a static `opacity` in the caller's style would be overridden.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    opacity: (disabled ? 0.42 : 1) * (1 - pressed.value * (1 - dimTo)),
  }));

  return (
    <AnimatedPressable
      ref={(node: unknown) => {
        setHost((current: unknown) => (current === node ? current : node));
      }}
      {...rest}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = reduced ? 0 : withSpring(1, motion.press);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, motion.press);
      }}
      style={[style, animatedStyle] as StyleProp<AnimatedStyle<ViewStyle>>}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * A value that animates from 0 to `to` once mounted — used by the ribbon
 * marker, rails, and bars so data draws itself in.
 */
export function useDrawIn(to: number, delay = 0) {
  const reduced = useReducedMotion();
  const value = useSharedValue(reduced ? to : 0);

  useEffect(() => {
    if (reduced) {
      value.value = to;
      return;
    }
    value.value = withDelay(delay, withSpring(to, motion.springSoft));
    // Same guarantee as Reveal: a mark that never animates must still land on
    // its real value rather than reading zero.
    const settle = setTimeout(() => {
      value.value = to;
    }, delay + 1200);
    return () => clearTimeout(settle);
  }, [delay, reduced, to, value]);

  return value;
}

export { Animated };
