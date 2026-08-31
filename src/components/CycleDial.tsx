/* eslint-disable react-hooks/immutability -- A Reanimated shared value is a
   deliberately mutable handle onto the UI thread; the React Compiler rule
   reads every `.value =` as a forbidden write to React state. Everything the
   rule is protecting (render output, React state) is still derived normally. */
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { format } from 'date-fns';
import { PressableScale } from '@/components/motion';
import { AppIcon } from '@/components/ui';
import { buildCycleDialModel } from '@/engine/dial';
import {
  progressToDay,
  snapProgress,
  shortestTarget,
  touchToProgress,
  wrapCycleDay,
  wrapUnit,
  wrappedAround,
} from '@/engine/dialMotion';
import type { DailyLog, PeriodEpisode, PersonalPattern } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { addLocalDays, parseLocalDate, toLocalDateString } from '@/utils/dates';
import { uniqueHapticDays } from '@/utils/hapticMarks';
import {
  attachIosSwitchOverlay,
  hostElementFromNode,
  playGlideHaptic,
  playImpactHaptic,
  playSelectionHaptic,
  primeWebHaptics,
  type HapticOrigin,
} from '@/utils/haptics';
import {
  motion,
  radii,
  softShadow,
  spacing,
  typography,
  withAlpha,
} from '@/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const TAU = Math.PI * 2;
/** Breathing room between phase arcs, in radians — the seam at the top of the
 *  ring is cycle day one, so the gaps double as a reading of where a cycle
 *  restarts rather than being purely decorative. */
const ARC_GAP = 0.02;

type Phase = {
  key: string;
  label: string;
  /** The hedged one-liner shown when the dial rests inside this phase. */
  note: string;
  /** 1-based, inclusive. */
  start: number;
  end: number;
  from: string;
  to: string;
};

/** A point on the dial, measured clockwise from twelve o'clock. */
function pointOn(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) };
}

/**
 * A closed ring drawn as two half arcs starting at twelve o'clock and running
 * clockwise, so a dash offset along it reads directly as days elapsed. A plain
 * `<Circle>` would start at three o'clock and need a rotation, and rotation
 * origins do not survive react-native-svg on the web.
 */
function ringPath(cx: number, cy: number, r: number) {
  const top = pointOn(cx, cy, r, 0);
  const bottom = pointOn(cx, cy, r, Math.PI);
  return `M ${top.x.toFixed(2)} ${top.y.toFixed(2)} A ${r.toFixed(
    2,
  )} ${r.toFixed(2)} 0 0 1 ${bottom.x.toFixed(2)} ${bottom.y.toFixed(
    2,
  )} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${top.x.toFixed(
    2,
  )} ${top.y.toFixed(2)}`;
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
) {
  const sweep = Math.min(Math.max(end - start, 0.01), TAU - 0.001);
  const a = pointOn(cx, cy, r, start);
  const b = pointOn(cx, cy, r, start + sweep);
  const large = sweep > Math.PI ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(
    2,
  )} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

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
    const risingEnd = Math.min(
      cycleLength,
      periodDays + Math.max(1, Math.round(after * 0.55)),
    );
    return [
      {
        key: 'period',
        label: 'Period timing',
        note: 'the start you recorded, plus the length you usually have',
        start: 1,
        end: periodDays,
        from: colors.periodDeep,
        to: colors.period,
      },
      {
        key: 'rising',
        label: 'Earlier cycle',
        note: 'after bleeding, before the second half of the cycle',
        start: periodDays + 1,
        end: risingEnd,
        from: accentGlow,
        to: accentGlow,
      },
      {
        key: 'winding',
        label: 'Later cycle',
        note: 'the run-up to your next estimated period',
        start: risingEnd + 1,
        end: cycleLength,
        from: accent,
        // Warming back toward the period tone, but stopping short of it: on a
        // ring the last day sits against the first, and two blocks of the same
        // deep red would hide where a cycle actually restarts.
        to: withAlpha(colors.period, 0.45),
      },
    ].filter((p) => p.end >= p.start);
  }

  const phases: Phase[] = [];
  let cursor = 1;
  const addRange = (
    key: string,
    label: string,
    note: string,
    start: number,
    end: number,
    from: string,
    to: string,
  ) => {
    const safeStart = Math.max(cursor, start, 1);
    const safeEnd = Math.min(cycleLength, end);
    if (safeEnd < safeStart) return;
    phases.push({ key, label, note, start: safeStart, end: safeEnd, from, to });
    cursor = safeEnd + 1;
  };

  const fertile = fertileWindow ?? [periodDays + 1, periodDays + 2];
  const ovulation = ovulationWindow ?? [fertile[0] + 1, fertile[0] + 2];
  const post = postOvulationWindow ?? [ovulation[1] + 1, ovulation[1] + 2];
  const fertileMayOverlapPeriod = fertile[0] <= periodDays;

  addRange(
    'period',
    fertileMayOverlapPeriod ? 'Period / possible fertile overlap' : 'Period',
    fertileMayOverlapPeriod
      ? 'bleeding and a calendar fertile estimate can share days'
      : 'the start you recorded, plus the length you usually have',
    1,
    periodDays,
    colors.periodDeep,
    colors.period,
  );
  addRange(
    'rising',
    'Earlier cycle',
    'after bleeding, before any fertile estimate begins',
    cursor,
    fertile[0] - 1,
    accentGlow,
    accent,
  );
  addRange(
    'fertile',
    'Possible fertile days',
    'a broad estimate, and not contraception',
    fertile[0],
    ovulation[0] - 1,
    colors.fertile,
    withAlpha(colors.fertile, 0.7),
  );
  addRange(
    'possible-ovulation',
    'Estimated ovulation timing',
    'a possible range, never an exact day',
    ovulation[0],
    ovulation[1],
    colors.fertile,
    colors.fertile,
  );
  addRange(
    'possible-post-ovulation',
    'Later-cycle estimate',
    'ovulation is not confirmed by dates alone',
    post[0],
    post[1],
    accent,
    accent,
  );
  addRange(
    'winding',
    'Later cycle',
    'the run-up to your next estimated period',
    cursor,
    cycleLength,
    accent,
    withAlpha(colors.period, 0.45),
  );
  return phases;
}

/**
 * The cycle dial: the whole month bent into a ring, with a handle you can hold
 * and glide to read any day of it. The knob tracks the finger on the UI thread
 * so the drag never lags, while the day underneath it snaps a step at a time —
 * a cycle is counted in whole days, so the readout should never show a blur
 * between two of them.
 *
 * Orientation first, as everywhere else in Luma: every phase is named in the
 * legend and in the readout, so hue is never the only thing carrying meaning.
 */
export function CycleDial({
  cycleDay,
  cycleLength = 28,
  periodLength = 5,
  cycleStart,
  fertilityEnabled = false,
  fertileWindow,
  ovulationWindow,
  postOvulationWindow,
  compact = false,
  interactive = true,
  logs = {},
  episodes = [],
  patterns = [],
  asOf,
  onSelectDay,
  onOpenDay,
  onLogDay,
}: {
  cycleDay?: number;
  cycleLength?: number;
  periodLength?: number;
  /** Cycle day one as YYYY-MM-DD, so the dial can name real dates. */
  cycleStart?: string;
  fertilityEnabled?: boolean;
  fertileWindow?: [number, number];
  ovulationWindow?: [number, number];
  postOvulationWindow?: [number, number];
  compact?: boolean;
  interactive?: boolean;
  logs?: Record<string, DailyLog>;
  episodes?: PeriodEpisode[];
  patterns?: PersonalPattern[];
  asOf?: string;
  onSelectDay?: (day: number) => void;
  onOpenDay?: (date: string) => void;
  onLogDay?: (date: string) => void;
}) {
  const { colors, accent, accentGlow, isDark, tint } = useTheme();
  const reduced = useReducedMotion();
  const rawId = useId();
  const uid = useMemo(() => rawId.replace(/[^a-zA-Z0-9]/g, ''), [rawId]);

  const [width, setWidth] = useState(0);

  const expectedLength = Math.max(14, Math.min(90, Math.round(cycleLength)));
  const today = cycleDay
    ? Math.max(1, Math.min(90, Math.round(cycleDay)))
    : undefined;
  // A late period runs past the expected length. Growing the ring keeps the
  // day number honest; clamping it would quietly report the wrong day on
  // exactly the cycle someone is most likely to be checking.
  const totalDays = Math.max(expectedLength, today ?? 0);
  const periodDays = Math.max(
    1,
    Math.min(Math.round(periodLength), Math.max(1, expectedLength - 3)),
  );
  const live = today !== undefined && interactive;

  // Windows arrive as fresh tuples on every parent render, so the memo is keyed
  // on the numbers inside them rather than the array identities.
  const fertileFrom = fertileWindow?.[0];
  const fertileTo = fertileWindow?.[1];
  const ovulationFrom = ovulationWindow?.[0];
  const ovulationTo = ovulationWindow?.[1];
  const postFrom = postOvulationWindow?.[0];
  const postTo = postOvulationWindow?.[1];

  const phases = useMemo(
    () =>
      buildPhases({
        colors,
        accent,
        accentGlow,
        periodDays,
        cycleLength: totalDays,
        fertilityEnabled,
        fertileWindow:
          fertileFrom !== undefined && fertileTo !== undefined
            ? [fertileFrom, fertileTo]
            : undefined,
        ovulationWindow:
          ovulationFrom !== undefined && ovulationTo !== undefined
            ? [ovulationFrom, ovulationTo]
            : undefined,
        postOvulationWindow:
          postFrom !== undefined && postTo !== undefined
            ? [postFrom, postTo]
            : undefined,
      }),
    [
      colors,
      accent,
      accentGlow,
      periodDays,
      totalDays,
      fertilityEnabled,
      fertileFrom,
      fertileTo,
      ovulationFrom,
      ovulationTo,
      postFrom,
      postTo,
    ],
  );

  const asOfDate = asOf ?? toLocalDateString();
  const dialModel = useMemo(
    () =>
      buildCycleDialModel({
        cycleStart,
        cycleLength: totalDays,
        expectedLength,
        asOf: asOfDate,
        logs,
        episodes,
        patterns,
      }),
    [cycleStart, totalDays, expectedLength, asOfDate, logs, episodes, patterns],
  );

  const [selectedDay, setSelectedDay] = useState(today ?? 1);
  const [scrubbing, setScrubbing] = useState(false);
  const ringRef = useRef<View>(null);
  const [ringHost, setRingHost] = useState<View | null>(null);
  const selectedDayRef = useRef(selectedDay);
  const lastHapticDayRef = useRef<number | null>(null);
  const lastHapticAtRef = useRef(0);

  useEffect(() => {
    selectedDayRef.current = selectedDay;
  }, [selectedDay]);

  const progress = useSharedValue(0);
  const pressed = useSharedValue(0);
  const dragging = useSharedValue(0);
  const readout = useSharedValue(1);

  const size = width > 0 ? Math.min(width, compact ? 264 : 336) : 0;
  const center = size / 2;
  const stroke = compact ? 16 : 22;
  const knobSize = compact ? 24 : 30;
  const orbitSize = knobSize + 34;
  const radius = Math.max(36, center - knobSize / 2 - 6);
  const trackRadius = radius + stroke / 2 + 7;
  const trackLength = TAU * trackRadius;
  const centerInset = center - radius + stroke / 2 + 20;

  const todayProgress = today ? (today - 0.5) / totalDays : 0;

  const hapticDays = useMemo(
    () => uniqueHapticDays(periodDays, dialModel.loggedDays),
    [periodDays, dialModel.loggedDays],
  );
  const hapticDaySet = useMemo(() => new Set(hapticDays), [hapticDays]);

  const tickForDay = useCallback(
    (day: number, previous: number | null, at?: HapticOrigin) => {
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (
        lastHapticDayRef.current === day &&
        now - lastHapticAtRef.current < 40
      ) {
        return;
      }
      lastHapticDayRef.current = day;
      lastHapticAtRef.current = now;
      const seam = previous != null && wrappedAround(previous, day, totalDays);
      if (Platform.OS === 'web') {
        if (hapticDaySet.has(day) || seam) playGlideHaptic(seam, at);
        return;
      }
      if (seam) playImpactHaptic('medium', at);
      else if (Platform.OS === 'ios') playSelectionHaptic(at);
      else playImpactHaptic('light', at);
    },
    [totalDays, hapticDaySet],
  );

  const applyDay = useCallback(
    (day: number, underFinger: boolean, previous: number | null) => {
      selectedDayRef.current = day;
      setSelectedDay(day);
      onSelectDay?.(day);
      if (!underFinger) return;
      tickForDay(day, previous);
    },
    [onSelectDay, tickForDay],
  );

  const setScrubbingState = useCallback((value: boolean) => {
    setScrubbing(value);
  }, []);

  useEffect(() => {
    primeWebHaptics();
  }, []);

  // iOS home-screen web only fires a Taptic pulse from a real pointer on a
  // native switch. Reanimated's runOnJS path is too far from the touch, so
  // web drives the glide from capture-phase pointer events and parks a switch
  // on the ring itself.
  useEffect(() => {
    if (Platform.OS !== 'web' || !live || size <= 0) return;
    const node = hostElementFromNode(ringHost ?? ringRef.current);
    if (!node) return;

    const inner = Math.max(0, radius - stroke / 2 - 16);
    const outer = radius + stroke / 2 + 18;
    const detachOverlay = attachIosSwitchOverlay(node, {
      center,
      innerRadius: inner,
      outerRadius: outer,
      days: hapticDays,
      totalDays,
      touchAction: 'none',
    });
    let draggingWeb = false;
    let pointerId: number | null = null;
    let lastProgress = (selectedDayRef.current - 0.5) / totalDays;
    let lastDay = selectedDayRef.current;

    const local = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };

    const inRing = (x: number, y: number) => {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance >= inner && distance <= outer;
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const { x, y } = local(event);
      if (!inRing(x, y)) return;
      draggingWeb = true;
      pointerId = event.pointerId;
      lastDay = selectedDayRef.current;
      lastProgress = (lastDay - 0.5) / totalDays;
      dragging.value = 1;
      pressed.value = withSpring(1, motion.press);
      setScrubbingState(true);
      const target = touchToProgress(x, y, center, lastProgress);
      if (Math.abs(target - lastProgress) > 1.5 / totalDays) {
        progress.value = withSpring(target, motion.spring);
      } else {
        progress.value = target;
      }
      lastProgress = target;
      playSelectionHaptic({
        clientX: event.clientX,
        clientY: event.clientY,
      });
    };

    const onMove = (event: PointerEvent) => {
      if (!draggingWeb || event.pointerId !== pointerId) return;
      const { x, y } = local(event);
      lastProgress = touchToProgress(x, y, center, lastProgress);
      progress.value = lastProgress;
      const day = progressToDay(lastProgress, totalDays);
      if (day === lastDay) return;
      const previous = lastDay;
      lastDay = day;
      tickForDay(day, previous, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      draggingWeb = false;
      pointerId = null;
      dragging.value = 0;
      pressed.value = withSpring(0, motion.press);
      setScrubbingState(false);
      progress.value = withSpring(
        snapProgress(progress.value, totalDays),
        motion.spring,
      );
    };

    node.addEventListener('pointerdown', onDown, { capture: true });
    window.addEventListener('pointermove', onMove, { capture: true });
    window.addEventListener('pointerup', onUp, { capture: true });
    window.addEventListener('pointercancel', onUp, { capture: true });
    return () => {
      detachOverlay?.();
      node.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
    };
  }, [
    live,
    size,
    center,
    radius,
    stroke,
    totalDays,
    tickForDay,
    hapticDays,
    ringHost,
    dragging,
    pressed,
    progress,
    setScrubbingState,
  ]);

  useAnimatedReaction(
    () => progressToDay(progress.value, totalDays),
    (day, previous) => {
      if (previous === null || day === previous) return;
      runOnJS(applyDay)(day, dragging.value === 1, previous);
    },
    [totalDays, applyDay],
  );

  // The mark draws itself from cycle day one round to today, the same arrival
  // the rest of the app uses — and because the readout follows the handle, the
  // number counts up with it. The timeout is the guarantee `useDrawIn` also
  // makes: a stalled frame driver must never leave the dial reading day one.
  useEffect(() => {
    if (today === undefined) return;
    if (reduced) {
      progress.value = todayProgress;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      120,
      withSpring(todayProgress, motion.springSoft),
    );
    const settle = setTimeout(() => {
      if (dragging.value === 0) progress.value = todayProgress;
    }, 1400);
    return () => clearTimeout(settle);
  }, [today, todayProgress, reduced, progress, dragging]);

  const selectedPhase =
    phases.find((p) => selectedDay >= p.start && selectedDay <= p.end) ??
    phases[phases.length - 1];
  const phaseKey = selectedPhase?.key;
  const reading = dialModel.readingFor(selectedDay);

  useEffect(() => {
    if (reduced) return;
    readout.value = 0.3;
    readout.value = withTiming(1, { duration: motion.base });
  }, [phaseKey, reduced, readout]);

  const goToDay = useCallback(
    (day: number) => {
      const next = wrapCycleDay(day, totalDays);
      setSelectedDay(next);
      const unit = (next - 0.5) / totalDays;
      if (reduced) {
        progress.value = unit;
        return;
      }
      progress.value = withSpring(
        shortestTarget(progress.value, unit),
        motion.spring,
      );
    },
    [totalDays, progress, reduced],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(live && Platform.OS !== 'web')
        .manualActivation(true)
        // Only the ring itself takes the drag. Anywhere else in the card has to
        // stay free for the page to scroll under the finger.
        .onTouchesDown((event, manager) => {
          const touch = event.changedTouches[0];
          if (!touch) return;
          const dx = touch.x - center;
          const dy = touch.y - center;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (
            distance > radius - stroke / 2 - 16 &&
            distance < radius + stroke / 2 + 18
          ) {
            manager.activate();
          } else {
            manager.fail();
          }
        })
        .onStart((event) => {
          dragging.value = 1;
          pressed.value = withSpring(1, motion.press);
          runOnJS(setScrubbingState)(true);
          runOnJS(playSelectionHaptic)();
          const target = touchToProgress(
            event.x,
            event.y,
            center,
            progress.value,
          );
          // Grabbing the handle itself must not nudge it; grabbing the far side
          // of the ring should bring the handle to the finger.
          if (Math.abs(target - progress.value) > 1.5 / totalDays) {
            progress.value = withSpring(target, motion.spring);
          } else {
            progress.value = target;
          }
        })
        .onUpdate((event) => {
          progress.value = touchToProgress(
            event.x,
            event.y,
            center,
            progress.value,
          );
        })
        .onFinalize(() => {
          dragging.value = 0;
          pressed.value = withSpring(0, motion.press);
          runOnJS(setScrubbingState)(false);
          // Rest on a whole day in the current lap, so the handle does not
          // unwind back to the first turn.
          progress.value = withSpring(
            snapProgress(progress.value, totalDays),
            motion.spring,
          );
        }),
    [
      live,
      center,
      radius,
      stroke,
      totalDays,
      progress,
      pressed,
      dragging,
      setScrubbingState,
    ],
  );

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${progress.value * 360}deg` },
      { translateY: -radius },
      { rotate: `${-progress.value * 360}deg` },
    ],
  }));

  // Quiet at rest so the handle reads as a clean mark, blooming while held so
  // the finger has something to feel it is holding.
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + pressed.value * 0.55,
    transform: [{ scale: 0.6 + pressed.value * 0.4 }],
  }));

  const trackProps = useAnimatedProps(() => ({
    strokeDashoffset: trackLength * (1 - wrapUnit(progress.value)),
  }));

  const readoutStyle = useAnimatedStyle(() => ({
    opacity: readout.value,
    transform: [{ translateY: (1 - readout.value) * 4 }],
  }));

  const selectedDate = cycleStart
    ? addLocalDays(cycleStart, selectedDay - 1)
    : undefined;
  const offset = today !== undefined ? selectedDay - today : 0;
  const relative =
    today === undefined
      ? undefined
      : offset === 0
        ? 'today'
        : offset > 0
          ? `in ${offset} day${offset === 1 ? '' : 's'}`
          : `${-offset} day${offset === -1 ? '' : 's'} ago`;

  const numberSize = compact ? 40 : 54;
  const trackBase = withAlpha(colors.text, isDark ? 0.1 : 0.06);

  const recordBits = [
    reading.logSummary ? `Recorded this cycle: ${reading.logSummary}.` : '',
    reading.patterns[0]
      ? `Usual pattern: ${reading.patterns[0].title}.`
      : reading.history[0]
        ? `On this cycle day before: ${reading.history
            .map((h) => `${h.label} in ${h.support} of ${h.total}`)
            .join(', ')}.`
        : reading.patternNote,
  ]
    .filter(Boolean)
    .join(' ');

  const a11yLabel =
    today === undefined
      ? 'Cycle dial showing period timing and the rest of the cycle, waiting for your first entry'
      : `Cycle dial. Day ${selectedDay} of approximately ${expectedLength}. ${
          selectedPhase?.label ?? ''
        }. ${recordBits}${
          fertilityEnabled
            ? ' Calendar-only fertile and ovulation timing are broad estimates, may overlap bleeding, and are not contraception.'
            : ''
        }`;

  const dayAction =
    reading.date && !reading.isFuture
      ? reading.log
        ? {
            label: 'Open this day',
            onPress: () => onOpenDay?.(reading.date!),
            enabled: !!onOpenDay,
          }
        : {
            label: 'Log this day',
            onPress: () => onLogDay?.(reading.date!),
            enabled: !!onLogDay,
          }
      : undefined;

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        const next = e.nativeEvent.layout.width;
        setWidth((current) =>
          Math.abs(current - next) > 0.5 ? next : current,
        );
      }}
    >
      <View
        accessible
        accessibilityRole={live ? 'adjustable' : 'image'}
        accessibilityLabel={a11yLabel}
        accessibilityValue={
          live ? { min: 1, max: totalDays, now: selectedDay } : undefined
        }
        accessibilityActions={
          live ? [{ name: 'increment' }, { name: 'decrement' }] : undefined
        }
        onAccessibilityAction={(event) => {
          if (!live) return;
          const step = event.nativeEvent.actionName === 'increment' ? 1 : -1;
          goToDay(selectedDay + step);
        }}
        style={styles.dialSlot}
      >
        {size > 0 ? (
          <GestureDetector gesture={pan}>
            <View
              ref={(node) => {
                ringRef.current = node;
                setRingHost((current) => (current === node ? current : node));
              }}
              style={{
                width: size,
                height: size,
                position: 'relative',
                overflow: 'visible',
              }}
            >
              <Svg width={size} height={size}>
                <Defs>
                  <RadialGradient
                    id={`dial-halo-${uid}`}
                    cx="50%"
                    cy="50%"
                    r="50%"
                  >
                    <Stop offset="0.55" stopColor={accent} stopOpacity="0" />
                    <Stop
                      offset="0.88"
                      stopColor={accent}
                      stopOpacity={isDark ? 0.18 : 0.13}
                    />
                    <Stop offset="1" stopColor={accent} stopOpacity="0" />
                  </RadialGradient>
                  {phases.map((p) => (
                    <LinearGradient
                      key={p.key}
                      id={`dial-${p.key}-${uid}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="1"
                    >
                      <Stop offset="0" stopColor={p.from} stopOpacity="1" />
                      <Stop offset="1" stopColor={p.to} stopOpacity="1" />
                    </LinearGradient>
                  ))}
                </Defs>

                <Circle
                  cx={center}
                  cy={center}
                  r={center}
                  fill={`url(#dial-halo-${uid})`}
                />
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={trackBase}
                  strokeWidth={stroke}
                />

                {phases.map((p) => (
                  <Path
                    key={p.key}
                    d={arcPath(
                      center,
                      center,
                      radius,
                      ((p.start - 1) / totalDays) * TAU +
                        // A double-width gap at twelve o'clock, so the join
                        // between the last day and the first reads as a seam.
                        (p.start === 1 ? ARC_GAP : 0),
                      (p.end / totalDays) * TAU - ARC_GAP,
                    )}
                    fill="none"
                    stroke={`url(#dial-${p.key}-${uid})`}
                    strokeWidth={stroke}
                  />
                ))}

                {/* A day scale inside the band, so the ring can be counted and
                    not just looked at. Weeks are longer and brighter. */}
                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = i + 1;
                  const isWeek = day % 7 === 0;
                  if (!isWeek && totalDays > 45) return null;
                  const angle = (day / totalDays) * TAU;
                  const outer = radius - stroke / 2 - 5;
                  const a = pointOn(center, center, outer, angle);
                  const b = pointOn(
                    center,
                    center,
                    outer - (isWeek ? 9 : 4),
                    angle,
                  );
                  return (
                    <Line
                      key={`tick-${day}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={withAlpha(
                        colors.text,
                        isWeek ? (isDark ? 0.34 : 0.28) : isDark ? 0.16 : 0.12,
                      )}
                      strokeWidth={isWeek ? 2 : 1}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Pattern hashes sit on the outer rim so a usual window is
                    countable, not just a wash of colour. */}
                {dialModel.patternDays.map((day) => {
                  const angle = ((day - 0.5) / totalDays) * TAU;
                  const outer = radius + stroke / 2 + 1;
                  const a = pointOn(center, center, outer, angle);
                  const b = pointOn(center, center, outer + 5, angle);
                  return (
                    <Line
                      key={`pattern-${day}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={colors.text}
                      strokeOpacity={isDark ? 0.45 : 0.38}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* A logged day is a named mark, never hue alone. */}
                {dialModel.loggedDays.map((day) => {
                  const p = pointOn(
                    center,
                    center,
                    radius - stroke / 2 - 11,
                    ((day - 0.5) / totalDays) * TAU,
                  );
                  return (
                    <Circle
                      key={`log-${day}`}
                      cx={p.x}
                      cy={p.y}
                      r={day === selectedDay ? 3.5 : 2.5}
                      fill={colors.text}
                    />
                  );
                })}

                {/* The thin outer rail carries how far through the cycle the
                    handle sits, and the dot on it stays fixed on today. */}
                <Circle
                  cx={center}
                  cy={center}
                  r={trackRadius}
                  fill="none"
                  stroke={trackBase}
                  strokeWidth={4}
                />
                <AnimatedPath
                  d={ringPath(center, center, trackRadius)}
                  fill="none"
                  stroke={accent}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray={`${trackLength} ${trackLength}`}
                  animatedProps={trackProps}
                />
                {today !== undefined
                  ? (() => {
                      const p = pointOn(
                        center,
                        center,
                        trackRadius,
                        ((today - 0.5) / totalDays) * TAU,
                      );
                      return (
                        <Circle
                          cx={p.x}
                          cy={p.y}
                          r={4}
                          fill={colors.text}
                          stroke={colors.background}
                          strokeWidth={2}
                        />
                      );
                    })()
                  : null}
              </Svg>

              {today !== undefined ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.orbit,
                    {
                      width: orbitSize,
                      height: orbitSize,
                      left: center - orbitSize / 2,
                      top: center - orbitSize / 2,
                    },
                    knobStyle,
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.halo,
                      {
                        width: orbitSize,
                        height: orbitSize,
                        borderRadius: orbitSize / 2,
                        backgroundColor: tint(0.22),
                      },
                      haloStyle,
                    ]}
                  />
                  <View
                    style={[
                      styles.knob,
                      {
                        width: knobSize,
                        height: knobSize,
                        borderRadius: knobSize / 2,
                        // The handle is paper in both themes: a raised dark
                        // surface vanishes into a dark ring.
                        backgroundColor: isDark
                          ? colors.text
                          : colors.surfaceRaised,
                        borderColor: withAlpha(
                          isDark ? colors.background : colors.text,
                          0.12,
                        ),
                      },
                      softShadow(isDark ? '#000000' : colors.text, 0.28, 10, 3),
                    ]}
                  >
                    <View
                      style={{
                        width: knobSize * 0.4,
                        height: knobSize * 0.4,
                        borderRadius: knobSize,
                        backgroundColor: selectedPhase?.from ?? accent,
                      }}
                    />
                  </View>
                </Animated.View>
              ) : null}

              <View
                pointerEvents="none"
                style={[styles.center, { padding: centerInset }]}
              >
                <Text
                  style={[
                    typography.eyebrow,
                    { color: offset === 0 ? accent : colors.textTertiary },
                  ]}
                >
                  {today === undefined
                    ? 'CYCLE'
                    : offset === 0
                      ? 'TODAY'
                      : 'CYCLE DAY'}
                </Text>
                <Text
                  style={[
                    typography.display,
                    styles.number,
                    {
                      color: colors.text,
                      fontSize: numberSize,
                      lineHeight: numberSize + 4,
                    },
                  ]}
                >
                  {today === undefined ? '—' : selectedDay}
                </Text>
                {selectedDate ? (
                  <Text
                    style={[typography.mono, { color: colors.textSecondary }]}
                  >
                    {format(parseLocalDate(selectedDate), 'EEE, MMM d')}
                  </Text>
                ) : null}
                {relative && offset !== 0 ? (
                  <Text
                    style={[
                      typography.caption,
                      { color: accent, marginTop: 2 },
                    ]}
                  >
                    {relative}
                  </Text>
                ) : null}
                {today === undefined ? (
                  <Text
                    style={[
                      typography.caption,
                      styles.emptyNote,
                      { color: colors.textSecondary },
                    ]}
                  >
                    start with the day your period begins
                  </Text>
                ) : null}
              </View>
            </View>
          </GestureDetector>
        ) : (
          <View style={{ width: '100%', aspectRatio: 1 }} />
        )}
      </View>

      {selectedPhase ? (
        <Animated.View style={[styles.readout, readoutStyle]}>
          <View
            style={[
              styles.readoutMark,
              { backgroundColor: selectedPhase.from },
            ]}
          />
          <View style={styles.readoutCopy}>
            <Text style={[typography.bodyMedium, { color: colors.text }]}>
              {selectedPhase.label}
            </Text>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginTop: 2 },
              ]}
            >
              {selectedPhase.note}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {live && !compact ? (
        <View style={[styles.facts, { borderTopColor: colors.border }]}>
          <View style={styles.factBlock}>
            <Text style={[typography.eyebrow, { color: colors.textTertiary }]}>
              {reading.log
                ? 'RECORDED THIS CYCLE'
                : reading.isFuture
                  ? 'NOT YET ARRIVED'
                  : 'RECORDED THIS CYCLE'}
            </Text>
            <Text
              style={[
                typography.body,
                {
                  color: reading.logSummary
                    ? colors.text
                    : colors.textSecondary,
                  marginTop: 4,
                },
              ]}
            >
              {reading.logSummary
                ? reading.logSummary
                : reading.isFuture
                  ? 'Nothing can be recorded until this day arrives.'
                  : 'Nothing recorded on this day yet.'}
            </Text>
            {dayAction?.enabled ? (
              <PressableScale
                onPress={dayAction.onPress}
                accessibilityRole="button"
                accessibilityLabel={dayAction.label}
                scaleTo={0.97}
                style={styles.factLink}
              >
                <Text style={[typography.label, { color: accent }]}>
                  {dayAction.label}
                </Text>
                <AppIcon name="arrow-forward" size={14} color={accent} />
              </PressableScale>
            ) : null}
          </View>

          <View style={styles.factBlock}>
            <Text style={[typography.eyebrow, { color: colors.textTertiary }]}>
              {reading.patterns.length
                ? 'USUAL AROUND HERE'
                : 'PATTERN FORMING'}
            </Text>
            {reading.patterns.length ? (
              <>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.text, marginTop: 4 },
                  ]}
                >
                  {reading.patterns[0].title}
                </Text>
                {reading.patterns.length > 1 ? (
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textSecondary, marginTop: 2 },
                    ]}
                  >
                    {`${reading.patterns.length - 1} more on Insights`}
                  </Text>
                ) : null}
              </>
            ) : reading.history.length ? (
              <Text
                style={[typography.body, { color: colors.text, marginTop: 4 }]}
              >
                {reading.history
                  .map((h) => `${h.label} in ${h.support} of ${h.total}`)
                  .join(' · ')}
              </Text>
            ) : null}
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginTop: 4 },
              ]}
            >
              {reading.patternNote}
            </Text>
          </View>
        </View>
      ) : null}

      {live ? (
        <View style={styles.hintRow}>
          <Text
            style={[
              typography.caption,
              styles.hint,
              { color: scrubbing ? accent : colors.textTertiary },
            ]}
          >
            {scrubbing
              ? 'release to rest on this day'
              : dialModel.loggedDays.length
                ? 'hold and glide around — dots are days you logged'
                : 'hold and glide around — it keeps going'}
          </Text>
          {/* Kept mounted and merely faded, so arriving at a different day
              never reflows the card under the finger that caused it. */}
          <View
            style={offset === 0 ? styles.todaySlotIdle : undefined}
            accessibilityElementsHidden={offset === 0}
            importantForAccessibility={
              offset === 0 ? 'no-hide-descendants' : 'yes'
            }
          >
            <PressableScale
              onPress={() => goToDay(today ?? 1)}
              accessibilityRole="button"
              accessibilityLabel="Return the dial to today"
              scaleTo={0.94}
              style={[
                styles.todayChip,
                { borderColor: colors.border, backgroundColor: tint(0.1) },
              ]}
            >
              <AppIcon name="locate-outline" size={14} color={accent} />
              <Text style={[typography.micro, { color: accent }]}>TODAY</Text>
            </PressableScale>
          </View>
        </View>
      ) : null}

      <View style={styles.legend}>
        {phases.map((p) => (
          <View key={p.key} style={styles.legendItem}>
            <View style={[styles.legendDash, { backgroundColor: p.from }]} />
            <Text
              style={[
                typography.eyebrow,
                { color: colors.textTertiary, fontSize: 10 },
              ]}
            >
              {p.label.toUpperCase()}
            </Text>
          </View>
        ))}
        {dialModel.loggedDays.length ? (
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.text }]}
            />
            <Text
              style={[
                typography.eyebrow,
                { color: colors.textTertiary, fontSize: 10 },
              ]}
            >
              LOGGED DAY
            </Text>
          </View>
        ) : null}
        {dialModel.patternDays.length ? (
          <View style={styles.legendItem}>
            <View
              style={[styles.legendHash, { backgroundColor: colors.text }]}
            />
            <Text
              style={[
                typography.eyebrow,
                { color: colors.textTertiary, fontSize: 10 },
              ]}
            >
              USUAL PATTERN
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  dialSlot: {
    width: '100%',
    alignItems: 'center',
  },
  orbit: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
  },
  knob: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  emptyNote: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  readout: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  readoutMark: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  readoutCopy: {
    flex: 1,
    minWidth: 0,
  },
  facts: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.lg,
    minHeight: 148,
  },
  factBlock: {
    minWidth: 0,
  },
  factLink: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  todayChip: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todaySlotIdle: {
    opacity: 0,
    pointerEvents: 'none',
  },
  hintRow: {
    marginTop: spacing.md,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  hint: {
    flex: 1,
    minWidth: 0,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: spacing.lg,
    rowGap: 6,
    columnGap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDash: {
    width: 12,
    height: 3,
    borderRadius: radii.full,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
  legendHash: {
    width: 10,
    height: 2,
    borderRadius: radii.full,
  },
});
