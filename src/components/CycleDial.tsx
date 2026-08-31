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
import {
  fertilityAbsenceIsResolvable,
  type FertilitySafety,
} from '@/engine/safety';
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
import { buildPhaseRamp, sampleRamp } from '@/theme/phaseColors';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const TAU = Math.PI * 2;
/** The one break left in the band, in radians. Twelve o'clock is cycle day
 *  one, and a ring has no other way to show where a cycle restarts — the last
 *  day would otherwise sit flush against the first. Every other boundary is a
 *  notch across a continuous band. */
const SEAM = 0.02;

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
    phases: {
      menstrual: string;
      menstrualSoft: string;
      follicular: string;
      follicularSoft: string;
      fertile: string;
      fertileSoft: string;
      luteal: string;
      lutealSoft: string;
    };
  };
  periodDays: number;
  cycleLength: number;
  fertilityEnabled: boolean;
  fertileWindow?: [number, number];
  ovulationWindow?: [number, number];
  postOvulationWindow?: [number, number];
}): Phase[] {
  const after = Math.max(1, cycleLength - periodDays);
  const hue = colors.phases;

  if (!fertilityEnabled) {
    const risingEnd = Math.min(
      cycleLength,
      periodDays + Math.max(1, Math.round(after * 0.55)),
    );
    return [
      {
        key: 'period',
        label: 'Period timing',
        note: 'Recorded start, usual length',
        start: 1,
        end: periodDays,
        from: hue.menstrual,
        to: hue.menstrualSoft,
      },
      {
        key: 'rising',
        label: 'Earlier cycle',
        note: 'After bleeding',
        start: periodDays + 1,
        end: risingEnd,
        // With no fertile window to mark, the opening half of the cycle is
        // what carries the ring up to its palest point.
        from: hue.follicular,
        to: hue.fertileSoft,
      },
      {
        key: 'winding',
        label: 'Later cycle',
        note: 'Toward your next period',
        start: risingEnd + 1,
        end: cycleLength,
        // Back down toward the period tone, which is what the next one is.
        // The seam at twelve o'clock is a real gap, so the last day never sits
        // flush against the first and the restart stays visible.
        from: hue.fertileSoft,
        to: hue.luteal,
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
      ? 'Bleeding and a fertile estimate can share days'
      : 'Recorded start, usual length',
    1,
    periodDays,
    hue.menstrual,
    hue.menstrualSoft,
  );
  addRange(
    'rising',
    'Earlier cycle',
    'After bleeding',
    cursor,
    fertile[0] - 1,
    hue.follicular,
    hue.follicularSoft,
  );
  addRange(
    'fertile',
    'Possible fertile days',
    'A broad estimate, not contraception',
    fertile[0],
    ovulation[0] - 1,
    hue.fertile,
    hue.fertileSoft,
  );
  addRange(
    'possible-ovulation',
    'Estimated ovulation timing',
    'A range, not an exact day',
    ovulation[0],
    ovulation[1],
    // The palest point of the whole ring.
    hue.fertileSoft,
    hue.fertileSoft,
  );
  addRange(
    'possible-post-ovulation',
    'Later-cycle estimate',
    'Dates alone do not confirm ovulation',
    post[0],
    post[1],
    hue.fertileSoft,
    hue.lutealSoft,
  );
  addRange(
    'winding',
    'Later cycle',
    'Toward your next period',
    cursor,
    cycleLength,
    hue.lutealSoft,
    hue.luteal,
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
/**
 * An absence has to be stated, and stated for the right reason. The ring has
 * several distinct reasons for carrying no fertile arc — some temporary, some
 * permanent, most fixable in the health profile — and collapsing them into one
 * "this cycle context" sentence told people a data gap was an exclusion they
 * could not clear. `insufficient_history` is the one that nothing but logging
 * resolves, so it is the one reason with no tap target.
 */
function FertilityAbsence({
  safety,
  onResolve,
}: {
  safety?: FertilitySafety;
  onResolve?: () => void;
}) {
  const { colors, accent } = useTheme();
  // `fertilityEnabled` is the profile toggle AND the safety verdict. If the
  // verdict is clear, the toggle is what is off.
  const reason = safety
    ? safety.canShow
      ? 'Fertile timing is off for this cycle'
      : safety.title
    : undefined;
  const actionable =
    Boolean(onResolve) &&
    safety !== undefined &&
    fertilityAbsenceIsResolvable(safety.availability);

  const body = (
    <>
      <Text style={[typography.caption, { color: colors.textTertiary }]}>
        Possible fertile days and estimated ovulation timing are not shown.
      </Text>
      {reason ? (
        <View style={styles.absenceReason}>
          <Text
            style={[
              typography.caption,
              { color: actionable ? accent : colors.textTertiary },
            ]}
          >
            {reason}
          </Text>
          {actionable ? (
            <AppIcon name="arrow-forward" size={13} color={accent} />
          ) : null}
        </View>
      ) : null}
    </>
  );

  if (!actionable) {
    return (
      <View style={[styles.indexNote, { borderTopColor: colors.border }]}>
        {body}
      </View>
    );
  }

  return (
    <PressableScale
      onPress={onResolve}
      accessibilityRole="button"
      accessibilityLabel={`${reason}. Open your health profile.`}
      scaleTo={0.98}
      style={[
        styles.indexNote,
        styles.absenceTap,
        { borderTopColor: colors.border },
      ]}
    >
      {body}
    </PressableScale>
  );
}

export function CycleDial({
  cycleDay,
  cycleLength = 28,
  periodLength = 5,
  cycleStart,
  fertilityEnabled = false,
  fertilitySafety,
  onResolveFertility,
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
  /** Why fertile timing is or is not available, so the ring can say which. */
  fertilitySafety?: FertilitySafety;
  onResolveFertility?: () => void;
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
  const { colors, accent, isDark, tint } = useTheme();
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
  // Open by default, because it is the only place the cycle's phases are
  // actually spelled out — each one's name, its span in cycle days and its
  // span in dates, and, when fertility is off, the fact that the fertile and
  // ovulation windows are not on the ring at all. Collapsed, that information
  // may as well not exist: a phase nobody drew is not a phase anyone can
  // notice is missing. The toggle is still there to win the height back.
  const [legendOpen, setLegendOpen] = useState(true);
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

  /**
   * A phase's own span, said twice: in cycle days, which is what the ring is
   * counted in, and in dates, which is what a calendar is read in. Without
   * this the dial could name the phase you were in but never when it runs.
   */
  const phaseSpan = useCallback(
    (phase: Phase) => {
      const days =
        phase.start === phase.end
          ? `day ${phase.start}`
          : `days ${phase.start}–${phase.end}`;
      if (!cycleStart) return { days, dates: null as string | null };
      const from = parseLocalDate(addLocalDays(cycleStart, phase.start - 1));
      const to = parseLocalDate(addLocalDays(cycleStart, phase.end - 1));
      return {
        days,
        dates:
          phase.start === phase.end
            ? format(from, 'MMM d')
            : `${format(from, 'MMM d')} – ${format(to, 'MMM d')}`,
      };
    },
    [cycleStart],
  );

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

  /**
   * One continuous band, not a block per phase.
   *
   * The ring used to be three solid arcs with a gap between them, so its
   * colour changed at an edge — a hard cut from red to ochre to violet. The
   * ramp gives each phase the middle of its own span and fades it into its
   * neighbour across the ground between them. It is stepped rather than
   * smooth because SVG has no angular gradient: short arcs sampled along the
   * ramp, one per ~7px of arc, which is under a pixel of colour change each.
   */
  const bandSteps = useMemo(() => {
    if (!phases.length || size <= 0) return [];
    const stops = buildPhaseRamp(phases);
    const arc = TAU - SEAM * 2;
    const count = Math.min(168, Math.max(48, Math.round((TAU * radius) / 7)));
    const step = arc / count;
    return Array.from({ length: count }, (_, i) => {
      const from = SEAM + i * step;
      const middle = from + step / 2;
      return {
        key: `band-${i}`,
        // A hair of overlap — without it antialiasing leaves a pale hairline
        // between every step and the fade reads as corduroy.
        d: arcPath(center, center, radius, from, from + step + 0.004),
        color: sampleRamp(stops, (middle / TAU) * totalDays),
      };
    });
  }, [phases, size, radius, center, totalDays]);
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

                {bandSteps.map((band) => (
                  <Path
                    key={band.key}
                    d={band.d}
                    fill="none"
                    stroke={band.color}
                    strokeWidth={stroke}
                  />
                ))}

                {/* Phases used to be told apart by a gap. The band is
                    continuous now, so each boundary carries a notch instead —
                    hue is still never the only thing marking one. */}
                {phases.slice(0, -1).map((p) => {
                  const angle = (p.end / totalDays) * TAU;
                  const a = pointOn(center, center, radius - stroke / 2, angle);
                  const b = pointOn(center, center, radius + stroke / 2, angle);
                  return (
                    <Line
                      key={`notch-${p.key}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={colors.background}
                      strokeWidth={2}
                      strokeOpacity={isDark ? 0.5 : 0.62}
                      strokeLinecap="butt"
                    />
                  );
                })}

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
                    typography.displayNumeric,
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
                {selectedPhase ? (
                  <Animated.View style={[styles.centerPhase, readoutStyle]}>
                    <View style={styles.centerPhaseName}>
                      <View
                        style={[
                          styles.centerPhaseMark,
                          {
                            backgroundColor: selectedPhase.from,
                            borderColor: withAlpha(colors.text, 0.28),
                          },
                        ]}
                      />
                      <Text
                        style={[
                          typography.label,
                          styles.centerPhaseLabel,
                          { color: colors.text },
                        ]}
                      >
                        {selectedPhase.label}
                      </Text>
                    </View>
                    <Text
                      style={[typography.mono, { color: colors.textTertiary }]}
                    >
                      {phaseSpan(selectedPhase).days}
                    </Text>
                  </Animated.View>
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

      {live && !compact ? (
        <View style={[styles.facts, { borderTopColor: colors.border }]}>
          {/* The phase note stays out here rather than inside the ring. Some
              of these are the careful ones — "A broad estimate, not
              contraception" — and they must never be squeezed for space. */}
          {selectedPhase ? (
            <Animated.Text
              style={[
                typography.caption,
                { color: colors.textSecondary },
                readoutStyle,
              ]}
            >
              {selectedPhase.note}
            </Animated.Text>
          ) : null}

          <View style={styles.factsRow}>
            <Text
              style={[
                typography.body,
                styles.factsSummary,
                {
                  color: reading.logSummary
                    ? colors.text
                    : colors.textSecondary,
                },
              ]}
            >
              {reading.logSummary
                ? reading.logSummary
                : reading.isFuture
                  ? 'Not yet'
                  : 'Nothing logged'}
            </Text>
            {dayAction?.enabled ? (
              <PressableScale
                onPress={dayAction.onPress}
                accessibilityRole="button"
                accessibilityLabel={dayAction.label}
                scaleTo={0.97}
                style={[
                  styles.factAction,
                  { borderColor: colors.border, backgroundColor: tint(0.1) },
                ]}
              >
                <Text style={[typography.label, { color: accent }]}>
                  {dayAction.label}
                </Text>
                <AppIcon name="arrow-forward" size={14} color={accent} />
              </PressableScale>
            ) : null}
          </View>

          {/* Only speak up when there is actually a pattern. The old block
              said "No repeat yet" every single day, which is a row of height
              spent on nothing. */}
          {reading.patterns.length ? (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {reading.patterns[0].title}
              {reading.patterns.length > 1
                ? ` · ${reading.patterns.length - 1} more on Insights`
                : ''}
            </Text>
          ) : reading.history.length ? (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {reading.history
                .map((h) => `${h.label} in ${h.support} of ${h.total}`)
                .join(' · ')}
            </Text>
          ) : null}
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
            {scrubbing ? 'Release to rest' : 'Hold and glide'}
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
          <PressableScale
            onPress={() => setLegendOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: legendOpen }}
            accessibilityLabel={
              legendOpen
                ? 'Hide the phases of this cycle'
                : 'Show every phase of this cycle, with its days and dates'
            }
            scaleTo={0.94}
            style={[styles.todayChip, { borderColor: colors.border }]}
          >
            <AppIcon
              name={legendOpen ? 'close-outline' : 'information-circle-outline'}
              size={14}
              color={colors.textSecondary}
            />
            <Text style={[typography.micro, { color: colors.textSecondary }]}>
              PHASES
            </Text>
          </PressableScale>
        </View>
      ) : null}

      {legendOpen ? (
        <View
          style={[styles.index, { borderTopColor: colors.border }]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={phases
            .map((phase) => {
              const span = phaseSpan(phase);
              return `${phase.label}, ${span.days}${
                span.dates ? `, ${span.dates}` : ''
              }`;
            })
            .concat(
              fertilityEnabled
                ? []
                : ['Fertile and ovulation timing are not shown for this cycle'],
              dialModel.loggedDays.length ? ['Logged day'] : [],
              dialModel.patternDays.length ? ['Usual pattern'] : [],
            )
            .join('. ')}
        >
          {phases.map((phase) => {
            const span = phaseSpan(phase);
            return (
              <View key={phase.key} style={styles.indexRow}>
                <View
                  style={[
                    styles.legendChip,
                    {
                      backgroundColor: phase.from,
                      borderColor: withAlpha(colors.text, 0.4),
                    },
                  ]}
                />
                <View style={styles.indexCopy}>
                  <View style={styles.indexHead}>
                    <Text
                      style={[
                        typography.label,
                        styles.indexLabel,
                        { color: colors.text },
                      ]}
                    >
                      {phase.label}
                    </Text>
                    <Text
                      style={[typography.mono, { color: colors.textSecondary }]}
                    >
                      {span.days}
                    </Text>
                  </View>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {span.dates ? `${span.dates} · ` : ''}
                    {phase.note}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* A missing colour is not something anyone can be expected to
              notice, so the ring names the absence and what would clear it. */}
          {fertilityEnabled ? null : (
            <FertilityAbsence
              safety={fertilitySafety}
              onResolve={onResolveFertility}
            />
          )}

          {dialModel.loggedDays.length ? (
            <View style={styles.indexRow}>
              <View
                style={[
                  styles.legendChip,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.text,
                    borderWidth: 2,
                  },
                ]}
              >
                <View
                  style={[styles.legendDot, { backgroundColor: colors.text }]}
                />
              </View>
              <Text
                style={[
                  typography.caption,
                  styles.indexCopy,
                  { color: colors.textSecondary },
                ]}
              >
                A day you logged this cycle
              </Text>
            </View>
          ) : null}
          {dialModel.patternDays.length ? (
            <View style={styles.indexRow}>
              <View
                style={[
                  styles.legendChip,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: withAlpha(colors.text, 0.32),
                  },
                ]}
              >
                <View style={styles.legendHashStack}>
                  <View
                    style={[
                      styles.legendHash,
                      { backgroundColor: colors.text },
                    ]}
                  />
                  <View
                    style={[
                      styles.legendHash,
                      { backgroundColor: colors.text },
                    ]}
                  />
                </View>
              </View>
              <Text
                style={[
                  typography.caption,
                  styles.indexCopy,
                  { color: colors.textSecondary },
                ]}
              >
                A day inside a repeating pattern
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
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
  centerPhase: {
    marginTop: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  centerPhaseName: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  centerPhaseMark: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  centerPhaseLabel: {
    flexShrink: 1,
    textAlign: 'center',
  },
  facts: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    // Still a floor, so scrubbing onto a day with a pattern cannot shove the
    // hint row under the finger — just a far cheaper one than 148.
    minHeight: 96,
  },
  factsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
  },
  factsSummary: {
    flex: 1,
    minWidth: 0,
  },
  factAction: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  index: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  indexRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  indexCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  indexHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  indexLabel: {
    flexShrink: 1,
  },
  indexNote: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  absenceReason: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  absenceTap: {
    minHeight: 44,
    justifyContent: 'center',
  },
  legendChip: {
    width: 32,
    height: 18,
    borderRadius: radii.xs,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
  },
  legendHashStack: {
    gap: 3,
    alignItems: 'center',
  },
  legendHash: {
    width: 14,
    height: 3,
    borderRadius: radii.full,
  },
});
