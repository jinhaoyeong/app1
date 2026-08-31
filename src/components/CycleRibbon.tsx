import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Line,
  G,
} from 'react-native-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { useDrawIn } from '@/components/motion';
import { radii, spacing, typography, withAlpha } from '@/theme/tokens';

const BAND_HEIGHT = 54;
const MARKER_WIDTH = 58;
const MARKER_FLAG_HEIGHT = 20;

type Phase = {
  key: string;
  label: string;
  days: number;
  from: string;
  to: string;
};

function buildPhases({
  colors,
  accent,
  accentGlow,
  periodDays,
  cycleLength,
  fertilityEnabled,
  fertileWindow,
  ovulationWindow,
  postOvulationWindow,
}: {
  colors: {
    period: string;
    periodDeep: string;
    predicted: string;
    fertile: string;
  };
  accent: string;
  accentGlow: string;
  periodDays: number;
  cycleLength: number;
  fertilityEnabled: boolean;
  fertileWindow?: [number, number];
  ovulationWindow?: [number, number];
  postOvulationWindow?: [number, number];
}): Phase[] {
  const after = Math.max(1, cycleLength - periodDays);
  if (!fertilityEnabled) {
    return [
      {
        key: 'period',
        label: 'Period timing',
        days: periodDays,
        from: colors.periodDeep,
        to: colors.period,
      },
      {
        key: 'rising',
        label: 'Earlier cycle',
        days: Math.round(after * 0.55),
        from: accentGlow,
        to: accentGlow,
      },
      {
        key: 'winding',
        label: 'Later cycle',
        days: after - Math.round(after * 0.55),
        from: accent,
        to: colors.periodDeep,
      },
    ];
  }
  const phases: Phase[] = [];
  let cursor = 1;
  const addRange = (
    key: string,
    label: string,
    start: number,
    end: number,
    from: string,
    to: string,
  ) => {
    const safeStart = Math.max(cursor, start, 1);
    const safeEnd = Math.min(cycleLength, end);
    if (safeEnd < safeStart) return;
    phases.push({ key, label, days: safeEnd - safeStart + 1, from, to });
    cursor = safeEnd + 1;
  };

  const fertile = fertileWindow ?? [periodDays + 1, periodDays + 2];
  const ovulation = ovulationWindow ?? [fertile[0] + 1, fertile[0] + 2];
  const post = postOvulationWindow ?? [ovulation[1] + 1, ovulation[1] + 2];

  const fertileMayOverlapPeriod = fertile[0] <= periodDays;
  addRange(
    'period',
    fertileMayOverlapPeriod ? 'Period / possible fertile overlap' : 'Period',
    1,
    periodDays,
    colors.periodDeep,
    colors.period,
  );
  addRange(
    'rising',
    'Earlier cycle',
    cursor,
    fertile[0] - 1,
    accentGlow,
    accent,
  );
  addRange(
    'fertile',
    'Possible fertile days',
    fertile[0],
    ovulation[0] - 1,
    colors.fertile,
    withAlpha(colors.fertile, 0.7),
  );
  addRange(
    'possible-ovulation',
    'Estimated ovulation timing',
    ovulation[0],
    ovulation[1],
    colors.fertile,
    colors.fertile,
  );
  addRange(
    'possible-post-ovulation',
    'Later-cycle estimate',
    post[0],
    post[1],
    accent,
    accent,
  );
  addRange(
    'winding',
    'Later cycle',
    cursor,
    cycleLength,
    accent,
    withAlpha(colors.period, 0.75),
  );
  return phases;
}

/**
 * The cycle ribbon: one continuous band of light where each phase blends into
 * the next, with a marker that draws itself to today's position. Orientation
 * first — every phase is labelled, so hue is never the only signal.
 */
export function CycleRibbon({
  cycleDay,
  cycleLength = 28,
  periodLength = 5,
  fertilityEnabled = false,
  fertileWindow,
  ovulationWindow,
  postOvulationWindow,
  compact = false,
}: {
  cycleDay?: number;
  cycleLength?: number;
  periodLength?: number;
  fertilityEnabled?: boolean;
  fertileWindow?: [number, number];
  ovulationWindow?: [number, number];
  postOvulationWindow?: [number, number];
  compact?: boolean;
}) {
  const { colors, accent, accentGlow, isDark } = useTheme();
  const [width, setWidth] = useState(0);

  const safeCycleLength = Math.max(14, Math.min(90, cycleLength));
  const periodDays = Math.max(
    1,
    Math.min(periodLength, Math.max(1, safeCycleLength - 3)),
  );
  const phases = buildPhases({
    colors,
    accent,
    accentGlow,
    periodDays,
    cycleLength: safeCycleLength,
    fertilityEnabled,
    fertileWindow,
    ovulationWindow,
    postOvulationWindow,
  });
  const totalDays = phases.reduce((sum, p) => sum + p.days, 0);

  const position = cycleDay
    ? Math.max(0.02, Math.min(0.98, (cycleDay - 0.5) / totalDays))
    : 0;
  const markerX = useDrawIn(position, 180);

  // The stem sits exactly on today; the flag is a fixed-width label centred on
  // the stem but nudged inward so it never overhangs the band.
  const stemStyle = useAnimatedStyle(() => ({
    left: markerX.value * width - 1,
  }));
  const flagStyle = useAnimatedStyle(() => ({
    left: Math.max(
      0,
      Math.min(
        Math.max(0, width - MARKER_WIDTH),
        markerX.value * width - MARKER_WIDTH / 2,
      ),
    ),
  }));

  const height = compact ? 40 : BAND_HEIGHT;

  // Cumulative offsets so ticks and phase gradients agree. Built with a
  // reduce rather than a mutable cursor so nothing is reassigned during render.
  const segments = phases.reduce<
    ((typeof phases)[number] & { start: number; end: number })[]
  >((acc, p) => {
    const start = acc.length ? acc[acc.length - 1].end : 0;
    acc.push({ ...p, start, end: start + p.days / totalDays });
    return acc;
  }, []);

  const a11yLabel = cycleDay
    ? `Cycle day ${cycleDay} of approximately ${safeCycleLength} days${
        fertilityEnabled
          ? '. Calendar-only fertile and ovulation timing are broad estimates, may overlap bleeding, and are not contraception.'
          : ''
      }`
    : 'Cycle ribbon showing period days and the rest of the cycle, waiting for your first entry';

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
      onLayout={(e) => {
        const nextWidth = e.nativeEvent.layout.width;
        setWidth((current) =>
          Math.abs(current - nextWidth) > 0.5 ? nextWidth : current,
        );
      }}
      style={styles.wrap}
    >
      {cycleDay ? (
        <>
          <Animated.View
            style={[
              styles.markerFlag,
              { backgroundColor: colors.text },
              flagStyle,
            ]}
          >
            <Text
              style={[
                typography.eyebrow,
                { color: colors.background, fontSize: 10 },
              ]}
            >
              {`DAY ${cycleDay}`}
            </Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.markerStem,
              {
                backgroundColor: colors.text,
                height: height + 8,
                top: MARKER_FLAG_HEIGHT - 2,
              },
              stemStyle,
            ]}
          />
        </>
      ) : null}

      <View style={{ height: cycleDay ? MARKER_FLAG_HEIGHT + 4 : 0 }} />

      {width > 0 ? (
        <Svg width={width} height={height} style={styles.band}>
          <Defs>
            {segments.map((s) => (
              <LinearGradient
                key={s.key}
                id={`grad-${s.key}`}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <Stop offset="0" stopColor={s.from} stopOpacity="1" />
                <Stop offset="1" stopColor={s.to} stopOpacity="1" />
              </LinearGradient>
            ))}
          </Defs>
          <G>
            {segments.map((s, i) => (
              <Rect
                key={s.key}
                x={s.start * width}
                y={0}
                width={
                  (s.end - s.start) * width + (i < segments.length - 1 ? 1 : 0)
                }
                height={height}
                fill={`url(#grad-${s.key})`}
              />
            ))}
            {/* Phase boundaries, drawn as notches rather than left to hue:
                a warm accent like Dust Rose sits close to the period signal,
                and the segments must stay distinguishable regardless. */}
            {segments.slice(0, -1).map((s) => (
              <Line
                key={`edge-${s.key}`}
                x1={s.end * width}
                y1={0}
                x2={s.end * width}
                y2={height}
                stroke={isDark ? '#00000055' : '#FFFFFFA0'}
                strokeWidth={2}
              />
            ))}
            {/* Week ticks give the band a measurable scale. */}
            {Array.from({ length: Math.floor(totalDays / 7) }).map((_, i) => {
              const x = ((i + 1) * 7) / totalDays;
              if (x >= 1) return null;
              return (
                <Line
                  key={`tick-${i}`}
                  x1={x * width}
                  y1={height - 9}
                  x2={x * width}
                  y2={height}
                  stroke={isDark ? '#00000066' : '#FFFFFF88'}
                  strokeWidth={1}
                />
              );
            })}
          </G>
        </Svg>
      ) : (
        <View style={{ height }} />
      )}

      {/*
        A wrapping legend rather than labels pinned under each segment: a
        narrow phone cannot give "Winding down" the width its segment implies,
        and a truncated phase name is worse than a reflowed one.
      */}
      <View
        style={styles.legend}
        accessible
        accessibilityRole="text"
        accessibilityLabel={segments.map((s) => s.label).join(', ')}
      >
        {segments.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View
              style={[
                styles.legendChip,
                {
                  backgroundColor: s.from,
                  borderColor:
                    s.from === accentGlow
                      ? accent
                      : withAlpha(colors.text, 0.4),
                  borderWidth: s.from === accentGlow ? 2 : 1,
                },
              ]}
            />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  band: {
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  markerFlag: {
    position: 'absolute',
    top: 0,
    zIndex: 5,
    width: MARKER_WIDTH,
    height: MARKER_FLAG_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xs,
  },
  markerStem: {
    position: 'absolute',
    width: 2,
    zIndex: 4,
    borderRadius: 1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: spacing.md,
    rowGap: spacing.md,
    columnGap: spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendChip: {
    width: 32,
    height: 18,
    borderRadius: radii.xs,
    borderWidth: 1,
  },
});
