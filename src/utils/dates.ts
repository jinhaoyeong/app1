import { format, parseISO, addDays, differenceInCalendarDays, isValid } from 'date-fns';

/** Local calendar date as YYYY-MM-DD — never derive health dates from UTC alone. */
export function toLocalDateString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseLocalDate(dateStr: string): Date {
  const d = parseISO(dateStr);
  if (!isValid(d)) {
    throw new Error(`Invalid local date: ${dateStr}`);
  }
  return d;
}

export function addLocalDays(dateStr: string, days: number): string {
  return format(addDays(parseLocalDate(dateStr), days), 'yyyy-MM-dd');
}

export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseLocalDate(b), parseLocalDate(a));
}

export function greetingForNow(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function mean(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values: number[]): number | undefined {
  if (values.length < 2) return undefined;
  const m = mean(values)!;
  const variance =
    values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function weightedMean(values: number[], weights: number[]): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i++) {
    num += values[i] * weights[i];
    den += weights[i];
  }
  return den === 0 ? 0 : num / den;
}
