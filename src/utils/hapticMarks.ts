/**
 * Clip-path geometry for iOS home-screen dial haptics.
 *
 * Safari ticks when a finger re-enters a switch at a clip-path join. The
 * overlay that actually buzzed used `path(evenodd, "… a … a …")` — two
 * relative 180° arcs, so the only joins were twelve and six o'clock. This
 * file keeps that exact command shape (evenodd, relative `a`) and puts a
 * join on each period day and each logged-day dot instead.
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

function pointOn(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) };
}

function fmt(value: number) {
  return value.toFixed(2);
}

export function hapticDayAngle(day: number, totalDays: number) {
  return ((day - 0.5) / totalDays) * TAU;
}

function relativeArcs(
  cx: number,
  cy: number,
  radius: number,
  angles: number[],
  sweepFlag: 0 | 1,
): string {
  const start = pointOn(cx, cy, radius, angles[0]);
  let d = `M ${fmt(start.x)} ${fmt(start.y)}`;
  for (let i = 1; i < angles.length; i++) {
    let sweep = angles[i] - angles[i - 1];
    if (sweepFlag === 1 && sweep < 0) sweep += TAU;
    if (sweepFlag === 0 && sweep > 0) sweep -= TAU;
    const large = Math.abs(sweep) > Math.PI ? 1 : 0;
    const from = pointOn(cx, cy, radius, angles[i - 1]);
    const to = pointOn(cx, cy, radius, angles[i]);
    d += ` a ${fmt(radius)} ${fmt(radius)} 0 ${large} ${sweepFlag} ${fmt(
      to.x - from.x,
    )} ${fmt(to.y - from.y)}`;
  }
  return d;
}

/**
 * Raw SVG path `d` (evenodd: outer clockwise, inner hole counterclockwise).
 * One relative `a` per haptic day on each ring — those joins are the ticks.
 */
export function buildHapticSwitchPathD(input: {
  center: number;
  innerRadius: number;
  outerRadius: number;
  days: readonly number[];
  totalDays: number;
}): string {
  const { center, innerRadius, outerRadius, totalDays } = input;
  const days = input.days.filter((day) => day >= 1 && day <= totalDays);
  const marks = days.length > 0 ? days : [1];
  const angles = marks
    .map((day) => hapticDayAngle(day, totalDays))
    .sort((a, b) => a - b);
  if (angles.length === 1) {
    angles.push(angles[0] + TAU / 3, angles[0] + (2 * TAU) / 3);
    angles.sort((a, b) => a - b);
  }
  const clockwise = [...angles, angles[0] + TAU];
  const counter = [
    angles[0],
    ...angles
      .slice(1)
      .reverse()
      .map((angle) => angle - TAU),
    angles[0] - TAU,
  ];
  const outer = relativeArcs(center, center, outerRadius, clockwise, 1);
  const inner = relativeArcs(center, center, innerRadius, counter, 0);
  return `${outer} ${inner}`;
}

/** CSS clip-path value in the same form Safari already accepted. */
export function buildHapticSwitchClipPath(input: {
  center: number;
  innerRadius: number;
  outerRadius: number;
  days: readonly number[];
  totalDays: number;
  slitWidth?: number;
}): string {
  return `path(evenodd, "${buildHapticSwitchPathD(input)}")`;
}
