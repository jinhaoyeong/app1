import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing, typography } from '@/theme/tokens';

export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }, style]}>
      {children}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const body = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {body}
      </Pressable>
    );
  }
  return body;
}

export function Title({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.4}
      style={[typography.title, { color: colors.text }, style]}
    >
      {children}
    </Text>
  );
}

export function HeroText({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.3}
      style={[typography.hero, { color: colors.text }, style]}
    >
      {children}
    </Text>
  );
}

export function SectionTitle({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.4}
      style={[typography.section, { color: colors.text }, style]}
    >
      {children}
    </Text>
  );
}

export function Body({
  children,
  style,
  muted,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  muted?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.5}
      style={[
        typography.body,
        { color: muted ? colors.textSecondary : colors.text },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Caption({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.5}
      style={[typography.caption, { color: colors.textSecondary }, style]}
    >
      {children}
    </Text>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'secondary';
}) {
  const { colors, accent } = useTheme();
  const bg =
    variant === 'primary'
      ? accent
      : variant === 'secondary'
        ? colors.surfaceMuted
        : 'transparent';
  const fg =
    variant === 'primary'
      ? '#FFFFFF'
      : variant === 'ghost'
        ? accent
        : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: variant === 'ghost' ? colors.border : bg,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        },
      ]}
    >
      <Text
        allowFontScaling
        maxFontSizeMultiplier={1.3}
        style={[typography.bodyMedium, { color: fg, textAlign: 'center' }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** @deprecated emoji chips removed for a11y — label only */
  emoji?: string;
}) {
  const { colors, accent } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? `${accent}22` : colors.surfaceMuted,
          borderColor: selected ? accent : colors.border,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
          minHeight: 44,
          justifyContent: 'center',
        },
      ]}
    >
      <Text
        style={[
          typography.label,
          { color: colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

export function Row({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
  },
  button: {
    minHeight: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
});
