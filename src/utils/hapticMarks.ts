/**
 * Clip-path geometry for iOS home-screen dial haptics.
 *
 * Safari pulses when a finger leaves and re-enters a switch. The first overlay
 * was two 180° arcs, so the only re-entries were the joins at twelve and six
 * o'clock. This path uses the same SVG arc slices, with a gap on each period
 * day and each logged-day dot, so a glide re-enters on those marks instead.
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

/** Gap wide enough to actually leave the switch, but narrower than a day. */
export function hapticGapRadians(totalDays: number, midRadius: number) {
  const daySweep = TAU / Math.max(1, totalDays);
  const fromPixels = 12 / Math.max(24, midRadius);
  return Math.min(Math.max(fromPixels, 0.04), daySweep * 0.4);
}

/**
 * One closed ring-slice, the same `A` commands Safari already hit-tested
 * on the two-arc overlay. Clockwise on the outer edge, back on the inner.
 */
export function annulusSectorPath(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  start: number,
  end: number,
): string {
  let sweep = end - start;
  if (sweep <= 0) sweep += TAU;
  const large = sweep > Math.PI ? 1 : 0;
  const o0 = pointOn(cx, cy, outer, start);
  const o1 = pointOn(cx, cy, outer, end);
  const i1 = pointOn(cx, cy, inner, end);
  const i0 = pointOn(cx, cy, inner, start);
  return [
    `M ${fmt(o0.x)} ${fmt(o0.y)}`,
    `A ${fmt(outer)} ${fmt(outer)} 0 ${large} 1 ${fmt(o1.x)} ${fmt(o1.y)}`,
    `L ${fmt(i1.x)} ${fmt(i1.y)}`,
    `A ${fmt(inner)} ${fmt(inner)} 0 ${large} 0 ${fmt(i0.x)} ${fmt(i0.y)}`,
    'Z',
  ].join(' ');
}

/**
 * A ring that covers the whole dial except a gap on each haptic day. Crossing
 * a gap leaves and re-enters the switch — the same thing that ticked at
 * twelve and six, now aligned to period and logged marks.
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
  const days = input.days.filter((day) => day >= 1 && day <= totalDays);
  const midRadius = (innerRadius + outerRadius) / 2;
  const gap =
    input.slitWidth != null
      ? input.slitWidth / Math.max(24, midRadius)
      : hapticGapRadians(totalDays, midRadius);

  if (days.length === 0) {
    return `path("${annulusSectorPath(center, center, innerRadius, outerRadius, 0.001, TAU - 0.001)}")`;
  }

  const angles = days
    .map((day) => hapticDayAngle(day, totalDays))
    .sort((a, b) => a - b);
  const sectors: string[] = [];
  for (let i = 0; i < angles.length; i++) {
    const start = angles[i] + gap / 2;
    const end =
      (i === angles.length - 1 ? angles[0] + TAU : angles[i + 1]) - gap / 2;
    if (end - start < 0.02) continue;
    sectors.push(
      annulusSectorPath(center, center, innerRadius, outerRadius, start, end),
    );
  }
  return `path("${sectors.join(' ')}")`;
}
