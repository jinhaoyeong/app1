/**
 * Clip-path geometry for iOS home-screen dial haptics.
 *
 * The overlay that actually pulsed on device was an evenodd donut of relative
 * `a` arcs starting at the centre (`M c c m …`). Two 180° arcs join at twelve
 * and six o'clock — those joins are the only ticks the user felt. This file
 * keeps that exact path grammar and puts the joins on period days and
 * logged-day dots instead.
 */

const TAU = Math.PI * 2;

export function uniqueHapticDays(
  periodLength: number,
  loggedDays: readonly number[],
): number[] {
  const days = new Set<number>();
  const period = Math.max(0, Math.floor(periodLength));
  for (let day = 1; day <= period; day++) days.add(day);
  for (const day of loggedDays) {
    if (day >= 1) days.add(Math.round(day));
  }
  return [...days].sort((a, b) => a - b);
}

export function hapticDayAngle(day: number, totalDays: number) {
  return ((day - 0.5) / totalDays) * TAU;
}

function fmt(value: number) {
  const n = Math.abs(value) < 1e-9 ? 0 : value;
  return n.toFixed(2);
}

function sweepDelta(from: number, to: number, clockwise: boolean) {
  if (clockwise) {
    let delta = to - from;
    while (delta <= 0) delta += TAU;
    return delta;
  }
  let delta = from - to;
  while (delta <= 0) delta += TAU;
  return delta;
}

function relativeArcChain(
  center: number,
  radius: number,
  sequence: number[],
  clockwise: boolean,
): string {
  const start = sequence[0];
  let d = `M ${fmt(center)} ${fmt(center)} m ${fmt(radius * Math.sin(start))} ${fmt(-radius * Math.cos(start))}`;
  const sweepFlag = clockwise ? 1 : 0;
  for (let i = 0; i < sequence.length - 1; i++) {
    const from = sequence[i];
    const to = sequence[i + 1];
    const delta = sweepDelta(from, to, clockwise);
    const large = delta >= Math.PI - 1e-6 ? 1 : 0;
    const dx = radius * (Math.sin(to) - Math.sin(from));
    const dy = radius * (Math.cos(from) - Math.cos(to));
    d += ` a ${fmt(radius)} ${fmt(radius)} 0 ${large} ${sweepFlag} ${fmt(dx)} ${fmt(dy)}`;
  }
  return d;
}

function donutStops(days: readonly number[], totalDays: number): number[] {
  const unique = [
    ...new Set(days.filter((day) => day >= 1 && day <= totalDays)),
  ]
    .map((day) => hapticDayAngle(day, totalDays))
    .sort((a, b) => a - b);
  if (unique.length === 0) return [0, Math.PI];
  if (unique.length === 1) return [unique[0], unique[0] + Math.PI];
  return unique;
}

/**
 * Evenodd relative-arc donut — the same grammar as the overlay that ticked
 * at twelve and six, with joins on each haptic day.
 */
export function buildHapticSwitchClipPath(input: {
  center: number;
  innerRadius: number;
  outerRadius: number;
  days: readonly number[];
  totalDays: number;
  slitWidth?: number;
}): string {
  const { center, innerRadius, outerRadius, totalDays } = input;
  const stops = donutStops(input.days, totalDays);
  const clockwise = [...stops, stops[0] + TAU];
  const counterclockwise = [stops[0], ...stops.slice(1).reverse(), stops[0]];
  const outer = relativeArcChain(center, outerRadius, clockwise, true);
  const inner = relativeArcChain(center, innerRadius, counterclockwise, false);
  return `path(evenodd, "${outer} ${inner}")`;
}
