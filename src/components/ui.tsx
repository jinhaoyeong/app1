import React, { type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/theme/ThemeProvider';
import { PressableScale } from '@/components/motion';
import { radii, spacing, typography } from '@/theme/tokens';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.screen, { backgroundColor: colors.background }, style]}
    >
      {children}
    </View>
  );
}

export function AppIcon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.text} />;
}

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  color,
  tone = 'muted',
  size = 44,
}: {
  name: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  tone?: 'muted' | 'bare';
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={Math.max(0, (44 - size) / 2 + 6)}
      scaleTo={0.9}
      style={[
        styles.iconButton,
        size !== 44 && { width: size, height: size },
        tone === 'muted' && {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
          borderWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <AppIcon name={name} size={size < 40 ? 17 : 19} color={color} />
    </PressableScale>
  );
}

export function BackButton({
  onPress,
  label = 'Back',
}: {
  onPress: () => void;
  label?: string;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      scaleTo={0.94}
      style={[
        styles.backButton,
        { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
      ]}
    >
      <AppIcon name="arrow-back" size={16} color={colors.text} />
      <Text style={[typography.label, { color: colors.text }]}>{label}</Text>
    </PressableScale>
  );
}

/** The all-caps rule label that opens a section. */
export function Eyebrow({
  children,
  color,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        typography.eyebrow,
        { color: color ?? colors.textTertiary },
        style,
      ]}
    >
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Text>
  );
}

/** Eyebrow + hairline + optional trailing mark. The app's section rhythm. */
export function SectionRule({
  label,
  right,
  color,
  style,
}: {
  label: string;
  right?: ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionRule, style]}>
      <Eyebrow color={color}>{label}</Eyebrow>
      <View style={[styles.ruleLine, { backgroundColor: colors.border }]} />
      {right}
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  right,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
}) {
  const { accent } = useTheme();
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderCopy}>
        {eyebrow ? (
          <Eyebrow color={accent} style={{ marginBottom: spacing.sm }}>
            {eyebrow}
          </Eyebrow>
        ) : null}
        <HeroText>{title}</HeroText>
        {subtitle ? (
          <Body muted style={{ marginTop: spacing.sm, maxWidth: 520 }}>
            {subtitle}
          </Body>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  tone = 'surface',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  tone?: 'surface' | 'muted' | 'accent' | 'outline';
}) {
  const { colors, tint } = useTheme();
  const backgroundColor =
    tone === 'muted'
      ? colors.surfaceMuted
      : tone === 'accent'
        ? tint(0.1)
        : tone === 'outline'
          ? 'transparent'
          : colors.surface;
  const borderColor = tone === 'accent' ? tint(0.38) : colors.border;
  const cardStyle = [styles.card, { backgroundColor, borderColor }, style];
  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        scaleTo={0.985}
        style={[cardStyle, styles.cardPressable]}
      >
        {children}
      </PressableScale>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

export function DisplayText({
  children,
  style,
  color,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <Text
      allowFontScaling
      style={[typography.display, { color: color ?? colors.text }, style]}
    >
      {children}
    </Text>
  );
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
    <Text style={[typography.title, { color: colors.text }, style]}>
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
    <Text style={[typography.hero, { color: colors.text }, style]}>
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
    <Text style={[typography.section, { color: colors.text }, style]}>
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
    <Text style={[typography.caption, { color: colors.textSecondary }, style]}>
      {children}
    </Text>
  );
}

/** Measurements read as instrument output. */
export function DataText({
  children,
  style,
  color,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <Text
      style={[typography.mono, { color: color ?? colors.textTertiary }, style]}
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
  icon = 'arrow-forward',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'secondary' | 'danger';
  icon?: IconName | null;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, tint } = useTheme();
  const bg =
    variant === 'primary'
      ? colors.accent
      : variant === 'secondary'
        ? colors.surfaceMuted
        : variant === 'danger'
          ? `${colors.period}18`
          : 'transparent';
  const fg =
    variant === 'primary'
      ? colors.accentInk
      : variant === 'ghost'
        ? colors.accent
        : variant === 'danger'
          ? colors.period
          : colors.text;
  const borderColor =
    variant === 'ghost'
      ? tint(0.4)
      : variant === 'danger'
        ? `${colors.period}45`
        : variant === 'secondary'
          ? colors.border
          : bg;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.975}
      style={[styles.button, { backgroundColor: bg, borderColor }, style]}
    >
      <Text style={[typography.bodyMedium, { color: fg }]}>{label}</Text>
      {icon ? <AppIcon name={icon} size={17} color={fg} /> : null}
    </PressableScale>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tone,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Optional colour for the selected state, e.g. flow intensity. */
  tone?: string;
}) {
  const { colors } = useTheme();
  const active = tone ?? colors.accent;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      scaleTo={0.94}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? active : colors.surfaceMuted,
          borderColor: selected ? active : colors.border,
        },
      ]}
    >
      {selected ? (
        <AppIcon name="checkmark" size={14} color={colors.accentInk} />
      ) : null}
      <Text
        style={[
          typography.label,
          { color: selected ? colors.accentInk : colors.text },
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * A full-width selectable row. Used where options carry long labels and a
 * chip cloud would collapse to one pill per line anyway — the row makes that
 * layout intentional and gives a much larger touch target.
 */
export function OptionRow({
  label,
  detail,
  selected,
  onPress,
  multi = false,
  disabled = false,
}: {
  label: string;
  detail?: string;
  selected?: boolean;
  onPress: () => void;
  /** Square mark for multi-select, round for single-select. */
  multi?: boolean;
  disabled?: boolean;
}) {
  const { colors, tint } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{
        selected: !!selected,
        checked: !!selected,
        disabled,
      }}
      accessibilityLabel={label}
      scaleTo={0.98}
      style={[
        styles.optionRow,
        {
          backgroundColor: selected ? tint(0.12) : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
          opacity: disabled ? 0.56 : 1,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>
          {label}
        </Text>
        {detail ? (
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginTop: 2 },
            ]}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.optionMark,
          {
            borderRadius: multi ? radii.xs : radii.full,
            borderColor: selected ? colors.accent : colors.borderStrong,
            backgroundColor: selected ? colors.accent : 'transparent',
          },
        ]}
      >
        {selected ? (
          <AppIcon name="checkmark" size={14} color={colors.accentInk} />
        ) : null}
      </View>
    </PressableScale>
  );
}

/** A small, non-interactive status marker. */
export function Pill({
  label,
  color,
  icon,
  style,
}: {
  label: string;
  color?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const c = color ?? colors.accent;
  return (
    <View
      style={[
        styles.pill,
        { borderColor: `${c}55`, backgroundColor: `${c}14` },
        style,
      ]}
    >
      {icon ? <AppIcon name={icon} size={12} color={c} /> : null}
      <Text style={[typography.eyebrow, { color: c }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

export function ListRow({
  title,
  detail,
  onPress,
  right,
  destructive = false,
  icon,
}: {
  title: string;
  detail?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  icon?: IconName;
}) {
  const { colors, tint } = useTheme();
  const content = (
    <>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: tint(0.12) }]}>
          <AppIcon name={icon} size={17} color={colors.accent} />
        </View>
      ) : null}
      <View style={styles.listRowCopy}>
        <Text
          style={[
            typography.bodyMedium,
            { color: destructive ? colors.period : colors.text },
          ]}
        >
          {title}
        </Text>
        {detail ? (
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginTop: 3 },
            ]}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      {right ??
        (onPress ? (
          <AppIcon
            name="chevron-forward"
            size={17}
            color={colors.textTertiary}
          />
        ) : null)}
    </>
  );

  if (!onPress) return <View style={styles.listRow}>{content}</View>;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      scaleTo={0.99}
      dimTo={0.7}
      style={styles.listRow}
    >
      {content}
    </PressableScale>
  );
}

export function Metric({
  value,
  label,
  detail,
  color,
}: {
  value: string;
  label: string;
  detail?: string;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.metric}>
      <Text
        style={[
          typography.title,
          {
            color: color ?? colors.text,
            fontVariant: ['tabular-nums'],
          },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          typography.eyebrow,
          { color: colors.textTertiary, marginTop: spacing.xs },
        ]}
      >
        {label.toUpperCase()}
      </Text>
      {detail ? (
        <Text
          style={[
            typography.caption,
            { color: colors.textSecondary, marginTop: spacing.xs },
          ]}
        >
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

export function ProgressBar({
  progress,
  label,
}: {
  progress: number;
  label?: string;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel={label}>
      <View
        style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.accent,
              width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function RuleLabel({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.ruleLabel}>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <Text style={[typography.micro, { color: colors.textTertiary }]}>
        {children}
      </Text>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.divider, { backgroundColor: colors.border }, style]} />
  );
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

/** A quiet block for "nothing here yet" states that still feels designed. */
export function EmptyNote({
  icon = 'ellipse-outline',
  title,
  body,
}: {
  icon?: IconName;
  title: string;
  body?: string;
}) {
  const { colors, tint } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: colors.border }]}>
      <View style={[styles.emptyMark, { backgroundColor: tint(0.12) }]}>
        <AppIcon name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>
          {title}
        </Text>
        {body ? (
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginTop: 4 },
            ]}
          >
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Toggle row used across settings, with a real switch affordance. */
export function ToggleRow({
  title,
  detail,
  value,
  onChange,
}: {
  title: string;
  detail?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      onPress={() => onChange(!value)}
      style={styles.listRow}
    >
      <View style={styles.listRowCopy}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>
          {title}
        </Text>
        {detail ? (
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginTop: 3 },
            ]}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: value ? colors.accent : colors.surfaceMuted,
            borderColor: value ? colors.accent : colors.borderStrong,
          },
        ]}
      >
        <View
          style={[
            styles.switchThumb,
            {
              backgroundColor: value ? colors.accentInk : colors.textTertiary,
              alignSelf: value ? 'flex-end' : 'flex-start',
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
    overflow: Platform.OS === 'web' ? 'hidden' : 'visible',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  pageHeaderCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
  },
  sectionRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 20,
  },
  ruleLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  card: {
    borderRadius: radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xxxl,
  },
  cardPressable: {
    minHeight: 68,
  },
  button: {
    minHeight: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionRow: {
    minHeight: 60,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionMark: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  listRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  listRowCopy: {
    flex: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metric: {
    flex: 1,
    minWidth: 92,
  },
  progressTrack: {
    height: 5,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  ruleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyMark: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTrack: {
    width: 52,
    height: 32,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
  },
});
