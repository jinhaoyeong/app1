/**
 * Clip-path geometry for iOS home-screen dial haptics.
 *
 * Safari only pulses when a finger actually hits (or re-enters) a switch.
 * A two-arc donut has joins at twelve and six o'clock, so a glide feels like
 * two ticks at half and full cycle. This path is a seamless ring with a thin
 * radial slit on each period day and each logged day: crossing a slit leaves
 * and re-enters the switch, which is the pulse the marks deserve.
 */

const TAU = Math.PI * 2;
const RING_SEGMENTS = 72;

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

function polygonPath(points: { x: number; y: number }[], close = true): string {
  if (points.length === 0) return '';
  const head = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  const rest = points
    .slice(1)
    .map((p) => `L ${fmt(p.x)} ${fmt(p.y)}`)
    .join(' ');
  return close ? `${head} ${rest} Z` : `${head} ${rest}`;
}

function ringPolygon(
  cx: number,
  cy: number,
  radius: number,
  clockwise: boolean,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= RING_SEGMENTS; i++) {
    const index = clockwise ? i : RING_SEGMENTS - i;
    const angle = (index / RING_SEGMENTS) * TAU;
    points.push(pointOn(cx, cy, radius, angle));
  }
  return points;
}

function slitPolygon(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  angle: number,
  width: number,
): { x: number; y: number }[] {
  const half = width / 2;
  const tangent = { x: Math.cos(angle), y: Math.sin(angle) };
  const innerPt = pointOn(cx, cy, inner, angle);
  const outerPt = pointOn(cx, cy, outer, angle);
  return [
    {
      x: innerPt.x + tangent.x * half,
      y: innerPt.y + tangent.y * half,
    },
    {
      x: outerPt.x + tangent.x * half,
      y: outerPt.y + tangent.y * half,
    },
    {
      x: outerPt.x - tangent.x * half,
      y: outerPt.y - tangent.y * half,
    },
    {
      x: innerPt.x - tangent.x * half,
      y: innerPt.y - tangent.y * half,
    },
  ];
}

export function hapticDayAngle(day: number, totalDays: number) {
  return ((day - 0.5) / totalDays) * TAU;
}

/**
 * evenodd clip path: filled ring, then a slit at each haptic day so a glide
 * re-enters the switch as it passes period and logged marks.
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
  const slitWidth = input.slitWidth ?? 8;
  const outer = polygonPath(ringPolygon(center, center, outerRadius, true));
  const inner = polygonPath(ringPolygon(center, center, innerRadius, false));
  const slits = input.days
    .filter((day) => day >= 1 && day <= totalDays)
    .map((day) =>
      polygonPath(
        slitPolygon(
          center,
          center,
          innerRadius,
          outerRadius,
          hapticDayAngle(day, totalDays),
          slitWidth,
        ),
      ),
    );
  return `path(evenodd, "${[outer, inner, ...slits].join(' ')}")`;
}
