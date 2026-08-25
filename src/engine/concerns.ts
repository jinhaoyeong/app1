import { createId } from '@/utils/id';
import type {
  CycleContext,
  DailyLog,
  PainLevel,
  PeriodEpisode,
  Profile,
  SafetyLevel,
} from '@/types';
import { completedCycleLengths, relativeToPeriod } from './cycle';
import { isHormonalContraception } from './safety';
import { mean } from '@/utils/dates';

/**
 * The concern engine sits between pattern detection and education, and the
 * boundary between the three layers is the whole point:
 *
 *   Pattern engine  — "what happened?"                (described factually)
 *   Concern engine  — "is this worth acting on?"      (this file)
 *   Education       — "what causes this generally?"   (opened deliberately)
 *
 * This layer describes the person's own recorded pattern and recommends a next
 * action. It must never infer or name the condition behind that pattern.
 * Condition names belong only in medically reviewed education the person opens
 * themselves, never in a card generated from their own data — a named
 * condition attached to someone's own logs reads as a diagnosis no matter how
 * carefully it is hedged.
 *
 * Escalation requires all three of:
 *   repeatedPattern && meaningfulDeviation && contextAllowsInterpretation
 * A single threshold crossing is never enough. Someone whose cycles have always
 * run 35 days is not the same as someone whose last six ran 27-29 and who now
 * has three at 40.
 */

export interface ConcernInsight {
  id: string;
  kind: string;
  title: string;
  /** The person's own recorded facts, stated plainly. */
  evidence: string;
  body: string;
  safetyLevel: SafetyLevel;
  actionLabel?: string;
  actionHref?: string;
}

const CONVERSATION_TITLE = 'Worth a conversation';

const CANNOT_DETERMINE =
  'There are many possible explanations for this pattern, and Luma cannot determine the cause.';

const BRING_IT_WITH_YOU =
  'Because this has repeated across several cycles, it may be worth discussing with a healthcare professional. You can bring your recorded dates and symptoms with you.';

/**
 * Contexts where a date-and-symptom journal cannot be read as a deviation from
 * a personal baseline: either the baseline itself is expected to be moving, or
 * the person is already under care for the thing that would be surfaced.
 */
const CONTEXTS_BLOCKING_INTERPRETATION = new Set<CycleContext>([
  'possible_pregnancy',
  'postpartum',
  'breastfeeding',
  'contraception_transition',
  'perimenopause',
  'early_menarche',
  'pcos_or_thyroid',
  'endometriosis_or_adenomyosis',
  'bleeding_disorder',
  'recent_pregnancy_loss_or_abortion',
  'hysterectomy_or_ovarian_surgery',
  'bleeding_affecting_medication',
  'prefer_not_to_say',
]);

/**
 * Whether recorded dates can be read against a personal baseline at all. This
 * is about interpretability, not about hiding information: acute safety
 * prompts live in `detectChanges` and are deliberately not gated here.
 */
export function contextAllowsInterpretation(profile: Profile): boolean {
  if (profile.safetyContextReviewed !== true) return false;
  if (isHormonalContraception(profile.contraceptionType)) return false;
  const contexts = profile.safetyContexts ?? [];
  return !contexts.some((context) =>
    CONTEXTS_BLOCKING_INTERPRETATION.has(context),
  );
}

const PAIN_WEIGHT: Record<PainLevel, number> = {
  none: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
};

const IMPACT_WEIGHT = { none: 0, some: 1, significant: 2 } as const;

function cycleKeyFor(date: string, starts: string[]): string | undefined {
  const owning = starts.filter((start) => start <= date);
  return owning.length ? owning[owning.length - 1] : undefined;
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/**
 * Pain that repeats, disrupts daily life, and clusters around the period is a
 * different signal from occasional mild discomfort. Severity, frequency,
 * functional impact, and cycle timing are all read before escalating, so
 * "moderate backache on 11 scattered days" does not reach the same bar as
 * "severe pain that stopped normal activity in four consecutive cycles".
 */
function painConcern(
  episodes: PeriodEpisode[],
  logs: Record<string, DailyLog>,
  starts: string[],
): ConcernInsight | null {
  const recentStarts = starts.slice(-4);
  if (recentStarts.length < 3) return null;
  const windowStart = recentStarts[0];

  const cyclesWithDisruptivePain = new Set<string>();
  let disruptiveDays = 0;
  let severeDays = 0;
  let periodTimedDays = 0;

  for (const [date, log] of Object.entries(logs)) {
    if (date < windowStart) continue;
    const weight = log.pain ? PAIN_WEIGHT[log.pain] : 0;
    if (weight < 2) continue; // moderate or severe only
    const impact = log.functionalImpact
      ? IMPACT_WEIGHT[log.functionalImpact]
      : 0;
    // Either the pain was severe, or it interfered with ordinary activities.
    // Moderate pain that changed nothing about the day is not escalated.
    if (weight < 3 && impact < 1) continue;

    const key = cycleKeyFor(date, starts);
    if (!key) continue;
    cyclesWithDisruptivePain.add(key);
    disruptiveDays += 1;
    if (weight === 3) severeDays += 1;
    const rel = relativeToPeriod(date, episodes);
    if (rel !== undefined && rel >= -2 && rel <= 4) periodTimedDays += 1;
  }

  const repeated = cyclesWithDisruptivePain.size >= 3;
  const meaningful =
    disruptiveDays >= 4 && (severeDays >= 2 || disruptiveDays >= 6);
  if (!repeated || !meaningful) return null;

  const timing =
    periodTimedDays >= Math.ceil(disruptiveDays / 2)
      ? ' Most of those days fell around the start of your period.'
      : '';

  const cycleCount = cyclesWithDisruptivePain.size;
  const evidence =
    'Across your last ' +
    cycleCount +
    ' cycles you have logged pain that was severe or got in the way of your usual activities on ' +
    disruptiveDays +
    ' ' +
    plural(disruptiveDays, 'day', 'days') +
    '.' +
    timing;

  return {
    id: createId(),
    kind: 'repeated_disruptive_pain',
    title: CONVERSATION_TITLE,
    evidence,
    body: CANNOT_DETERMINE + '\n\n' + BRING_IT_WITH_YOU,
    safetyLevel: 2,
    actionLabel: 'Export a summary',
    actionHref: '/health-summary',
  };
}

/**
 * Cycle-length concern is measured against the person's own history, never
 * against a fixed day count. A long-standing 35-day rhythm is a baseline; a
 * sudden move away from a settled 28-day rhythm is a deviation.
 */
function cycleLengthConcern(episodes: PeriodEpisode[]): ConcernInsight | null {
  const lengths = completedCycleLengths(episodes);
  // Need enough history for a baseline plus repeated departures from it.
  if (lengths.length < 6) return null;

  const recent = lengths.slice(-3);
  const baselineLengths = lengths.slice(0, -3);
  const baseline = mean(baselineLengths);
  if (baseline === undefined) return null;

  const baselineSpread =
    Math.max(...baselineLengths) - Math.min(...baselineLengths);
  // A history that was already all over the place has no stable baseline to
  // deviate from, so there is nothing meaningful to report.
  if (baselineSpread > 9) return null;

  const threshold = Math.max(7, baselineSpread + 3);
  const deviations = recent.filter(
    (length) => Math.abs(length - baseline) > threshold,
  );
  if (deviations.length < 2) return null;

  const direction = deviations.every((length) => length > baseline)
    ? 'longer'
    : deviations.every((length) => length < baseline)
      ? 'shorter'
      : 'different';
  const roundedBaseline = Math.round(baseline);

  const evidence =
    deviations.length +
    ' of your last 3 cycles were ' +
    direction +
    ' than your usual pattern. Your earlier ' +
    baselineLengths.length +
    ' cycles averaged about ' +
    roundedBaseline +
    ' ' +
    plural(roundedBaseline, 'day', 'days') +
    '; the recent ones were ' +
    recent.join(', ') +
    ' days.';

  return {
    id: createId(),
    kind: 'cycle_length_shift',
    title: CONVERSATION_TITLE,
    evidence,
    body: CANNOT_DETERMINE + '\n\n' + BRING_IT_WITH_YOU,
    safetyLevel: 2,
    actionLabel: 'Export a summary',
    actionHref: '/health-summary',
  };
}

export function detectConcerns(options: {
  profile: Profile;
  episodes: PeriodEpisode[];
  logs: Record<string, DailyLog>;
}): ConcernInsight[] {
  const { profile, episodes, logs } = options;
  if (!contextAllowsInterpretation(profile)) return [];

  const starts = [...episodes]
    .map((episode) => episode.startDate)
    .sort()
    .filter((value, index, all) => all.indexOf(value) === index);
  if (starts.length < 3) return [];

  return [
    painConcern(episodes, logs, starts),
    cycleLengthConcern(episodes),
  ].filter((concern): concern is ConcernInsight => concern !== null);
}

/**
 * Condition names the concern layer must never emit. Education screens may use
 * them freely; anything generated from a person's own logs may not. Exported so
 * a test can hold the boundary rather than leaving it to review discipline.
 */
export const CONDITION_NAMES_FORBIDDEN_IN_CONCERNS = [
  'pcos',
  'polycystic',
  'endometriosis',
  'adenomyosis',
  'fibroid',
  'thyroid',
  'pmdd',
  'infertility',
  'infertile',
  'cancer',
  'tumour',
  'tumor',
  'pelvic inflammatory',
] as const;
