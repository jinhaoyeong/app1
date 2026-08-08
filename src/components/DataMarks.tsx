import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { useDrawIn } from '@/components/motion';
import { radii, spacing, typography } from '@/theme/tokens';

/** Height of the bar plot area, shared by the bars and the average line. */
const BAR_AREA = 132;

/**
 * A range rail: the band is where your cycles usually land, the notch is the
 * middle of that range. Both ends are labelled so the shape is never the only
 * information.
 */
export function RangeRail({
  range,
  average,
  unit = 'days',
}: {
  range?: [number, number];
  average?: number;
  unit?: string;
}) {
  const { colors, tint } = useTheme();
  const start = range?.[0] ?? 20;
  const end = range?.[1] ?? 32;
  const value = average ?? (start + end) / 2;
  const min = Math.max(14, Math.floor(start - 4));
  const max = Math.min(90, Math.ceil(Math.max(end, value) + 4));
  const scale = Math.max(1, max - min);

  const left = Math.max(0, Math.min(1, (start - min) / scale));
  const widthRatio = Math.max(0.08, Math.min(1 - left, (end - start) / scale));
  const markerRatio = Math.max(0, Math.min(1, (value - min) / scale));

  const grow = useDrawIn(1, 120);
  const bandStyle = useAnimatedStyle(() => ({
    left: `${left * 100}%`,
    width: `${widthRatio * grow.value * 100}%`,
  }));
  const markerStyle = useAnimatedStyle(() => ({
    left: `${markerRatio * grow.value * 100}%`,
  }));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        range
          ? `Usual cycle length from ${start} to ${end} ${unit}`
          : 'Cycle length range is still learning'
      }
    >
      <View style={[styles.rail, { backgroundColor: colors.surfaceMuted }]}>
        <Animated.View
          style={[
            styles.railBand,
            { backgroundColor: colors.accent },
            bandStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.railMarker,
            { backgroundColor: colors.text, borderColor: colors.background },
            markerStyle,
          ]}
        />
        <View style={[styles.railGlow, { backgroundColor: tint(0.08) }]} />
      </View>
      <View style={styles.railLabels}>
        <Text style={[typography.mono, { color: colors.textTertiary }]}>
          {min} {unit}
        </Text>
        <Text style={[typography.mono, { color: colors.textTertiary }]}>
          {max} {unit}
        </Text>
      </View>
    </View>
  );
}

/**
 * Recent cycle lengths as a bar column set — the fastest read of "am I
 * steady?" without asking anyone to interpret a chart.
 */
export function CycleBars({
  values,
  labels,
  average,
}: {
  values: number[];
  labels: string[];
  average?: number;
}) {
  const { colors, accent, accentGlow } = useTheme();
  const grow = useDrawIn(1, 200);
  if (values.length === 0) return null;

  // Anchor the scale below the shortest cycle so identical cycles still read
  // as a steady row rather than a wall of full-height slabs.
  const max = Math.max(...values, average ?? 0) || 1;
  const min = Math.min(...values, average ?? max);
  const floor = Math.max(0, min - Math.max(4, (max - min) * 1.2));
  const span = Math.max(1, max - floor);
  const averageRatio =
    average !== undefined
      ? Math.max(0, Math.min(1, (average - floor) / span))
      : undefined;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Recent cycle lengths: ${values
        .map((v, i) => `${labels[i]} ${v} days`)
        .join(', ')}${average ? `. Average ${average} days` : ''}`}
      style={styles.bars}
    >
      {averageRatio !== undefined ? (
        <View
          style={[
            styles.averageLine,
            {
              borderColor: colors.borderStrong,
              bottom: 22 + averageRatio * (BAR_AREA - 22),
            },
          ]}
        />
      ) : null}
      {values.map((v, i) => (
        <Bar
          key={`${labels[i]}-${i}`}
          ratio={(v - floor) / span}
          grow={grow}
          value={v}
          label={labels[i]}
          color={i === values.length - 1 ? accent : accentGlow}
          textColor={colors.textTertiary}
          valueColor={colors.text}
        />
      ))}
    </View>
  );
}

function Bar({
  ratio,
  grow,
  value,
  label,
  color,
  textColor,
  valueColor,
}: {
  ratio: number;
  grow: ReturnType<typeof useDrawIn>;
  value: number;
  label: string;
  color: string;
  textColor: string;
  valueColor: string;
}) {
  const style = useAnimatedStyle(() => ({
    height: `${Math.max(0.12, Math.min(1, ratio)) * grow.value * 100}%`,
  }));
  return (
    <View style={styles.barColumn}>
      <Text
        style={[
          typography.mono,
          { color: valueColor, marginBottom: 6, fontWeight: '700' },
        ]}
      >
        {value}
      </Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[styles.barFill, { backgroundColor: color }, style]}
        />
      </View>
      <Text
        numberOfLines={1}
        style={[
          typography.eyebrow,
          { color: textColor, marginTop: 8, fontSize: 9 },
        ]}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

/** A compact strength meter used by pattern cards. */
export function StrengthMeter({
  filled,
  total,
  label,
}: {
  filled: number;
  total: number;
  label: string;
}) {
  const { colors, accent } = useTheme();
  return (
    <View
      style={styles.meter}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${filled} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.meterTick,
            {
              backgroundColor: i < filled ? accent : colors.surfaceMuted,
              borderColor: i < filled ? accent : colors.border,
            },
          ]}
        />
      ))}
      <Text
        style={[
          typography.eyebrow,
          { color: colors.textTertiary, marginLeft: spacing.sm },
        ]}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    height: 16,
    borderRadius: radii.full,
    position: 'relative',
    overflow: 'visible',
    justifyContent: 'center',
  },
  railBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: radii.full,
  },
  railGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: radii.full,
    pointerEvents: 'none',
  },
  railMarker: {
    position: 'absolute',
    top: -5,
    marginLeft: -13,
    width: 26,
    height: 26,
    borderRadius: radii.full,
    borderWidth: 4,
  },
  railLabels: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    height: BAR_AREA,
  },
  averageLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    pointerEvents: 'none',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    maxWidth: 52,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: radii.xs,
    borderTopRightRadius: radii.xs,
    minHeight: 8,
  },
  meter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  meterTick: {
    width: 14,
    height: 5,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
