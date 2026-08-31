/**
 * Unwrapped circle math for the cycle dial. Progress is turns from cycle day
 * one: 0 is the first pass, 1 is the same position a lap later. Mapping to a
 * day always uses the fractional part, so a drag can cross twelve o'clock and
 * keep going instead of stopping at 360°.
 *
 * Marked as worklets so Reanimated can run them on the UI thread.
 */

export function wrapUnit(value: number) {
  'worklet';
  return value - Math.floor(value);
}

/** Where a (possibly multi-lap) progress lands, as a whole cycle day. */
export function progressToDay(value: number, totalDays: number) {
  'worklet';
  const unit = wrapUnit(value);
  return Math.min(totalDays, Math.max(1, Math.floor(unit * totalDays) + 1));
}

/**
 * Map a touch on the ring to an unwrapped progress that continues the current
 * spin. The finger only knows an angle in [0, 1); we pick the copy of that
 * angle within half a turn of `current` so crossing twelve o'clock adds or
 * subtracts a lap instead of clamping.
 */
export function touchToProgress(
  x: number,
  y: number,
  center: number,
  current: number,
) {
  'worklet';
  const tau = Math.PI * 2;
  let angle = Math.atan2(x - center, center - y);
  if (angle < 0) angle += tau;
  const next = angle / tau;
  const base = Math.floor(current);
  let candidate = base + next;
  if (candidate - current > 0.5) candidate -= 1;
  else if (current - candidate > 0.5) candidate += 1;
  return candidate;
}

/** Rest on a whole day without spinning the handle back to the first lap. */
export function snapProgress(value: number, totalDays: number) {
  'worklet';
  const day = progressToDay(value, totalDays);
  const unit = (day - 0.5) / totalDays;
  const base = Math.floor(value);
  let snapped = base + unit;
  if (snapped - value > 0.5) snapped -= 1;
  else if (value - snapped > 0.5) snapped += 1;
  return snapped;
}

/** Shortest spin from the current unwrapped progress to a unit target in [0, 1). */
export function shortestTarget(current: number, unit: number) {
  'worklet';
  const wrapped = wrapUnit(current);
  let delta = unit - wrapped;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return current + delta;
}

export function wrapCycleDay(day: number, totalDays: number) {
  'worklet';
  const index = (((Math.round(day) - 1) % totalDays) + totalDays) % totalDays;
  return index + 1;
}

export function wrappedAround(
  previous: number,
  next: number,
  totalDays: number,
) {
  return (
    (previous === totalDays && next === 1) ||
    (previous === 1 && next === totalDays)
  );
}
