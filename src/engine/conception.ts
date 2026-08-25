import type { Profile, TrackingGoal } from '@/types';
import type { CycleMap } from './fertility';
import { addLocalDays, daysBetween } from '@/utils/dates';
import type { FertilitySafety } from './safety';

/**
 * Conception guidance is built from two *separate* permissions that must never
 * be collapsed into one:
 *
 *   1. Intent  — has the person told Luma they are trying to conceive? This
 *      grants permission to show conception-oriented *education*.
 *   2. Evidence — does the cycle history clear `fertilityEstimateSafety`? This
 *      grants permission to show *personalised dates*.
 *
 * Declaring intent never lowers the evidence bar. A person trying to conceive
 * with irregular cycles gets the education and an honest explanation of why
 * Luma cannot put dates on it — not a date range the history cannot support.
 *
 * Intent is read only from the explicit tracking goal. Luma deliberately does
 * not infer that someone is trying to conceive from logged intimacy: guessing
 * at that from sexual behaviour would make the app feel like it is watching,
 * and it would not make the estimate any better.
 */

/** Peak conception probability sits in the two days *before* ovulation. */
export const HIGHER_OPPORTUNITY_DAYS_BEFORE_OVULATION = 2;

export interface ConceptionGuidance {
  /** The person has explicitly chosen the trying-to-conceive goal. */
  goalActive: boolean;
  /** Personalised dates cleared the fertility safety gate. */
  datesAvailable: boolean;
  title: string;
  /** Conception education. Always present when `goalActive`. */
  education: string;
  /** Current-cycle signals. Never described as confirming ovulation. */
  signalsNote: string;
  /** Present only when `datesAvailable`. */
  fertileWindow?: { start: string; end: string };
  /** The days leading into estimated ovulation. Never a single "best day". */
  higherOpportunityWindow?: { start: string; end: string };
  /** Present only when `datesAvailable`. */
  estimateCaveat?: string;
  /** Why dates are withheld. Present only when `!datesAvailable`. */
  blockedTitle?: string;
  blockedDetail?: string;
}

const EDUCATION =
  'The fertile window covers about six days — the five days before ovulation and ovulation day itself. The highest chance is generally in the one to two days before ovulation, not on ovulation day.\n\nHaving sex every one to two days across the fertile window means you are not relying on one exact day being right.';

const SIGNALS_NOTE =
  'Cervical mucus changes and LH ovulation tests can give you additional current-cycle fertility signals. An LH test detects the hormone surge that usually comes one to two days before ovulation, so it is indirect evidence of timing rather than confirmation that ovulation happened.';

const ESTIMATE_CAVEAT =
  'Your actual ovulation day can shift, even when cycles are regular. This estimate comes from your recorded period dates and does not confirm ovulation.';

export function hasConceptionGoal(goals: TrackingGoal[] | undefined): boolean {
  return !!goals?.includes('trying_to_conceive');
}

/**
 * The days leading into the ovulation estimate. Because the ovulation window
 * is itself a range, this is anchored on the middle of that range and reported
 * as a span — a single "best day" would be false precision the calendar cannot
 * support.
 */
function higherOpportunityWindow(cycleMap: CycleMap): {
  start: string;
  end: string;
} {
  const spanDays = daysBetween(
    cycleMap.ovulationWindowStart,
    cycleMap.ovulationWindowEnd,
  );
  const centre = addLocalDays(
    cycleMap.ovulationWindowStart,
    Math.floor(spanDays / 2),
  );
  const start = addLocalDays(centre, -HIGHER_OPPORTUNITY_DAYS_BEFORE_OVULATION);
  // Clamp inside the fertile window so the highlighted days never fall outside
  // the range they are supposed to be narrowing.
  return {
    start:
      start < cycleMap.fertileWindowStart ? cycleMap.fertileWindowStart : start,
    end:
      centre > cycleMap.fertileWindowEnd ? cycleMap.fertileWindowEnd : centre,
  };
}

export function buildConceptionGuidance(options: {
  profile: Profile;
  cycleMap: CycleMap | null;
  fertilitySafety: FertilitySafety;
  fertilityVisible: boolean;
}): ConceptionGuidance | null {
  const { profile, cycleMap, fertilitySafety, fertilityVisible } = options;

  // No declared intent means no conception guidance at all. Nothing here is
  // inferred from what has been logged.
  if (!hasConceptionGoal(profile.trackingGoals)) return null;

  const base: ConceptionGuidance = {
    goalActive: true,
    datesAvailable: false,
    title: 'Trying to conceive',
    education: EDUCATION,
    signalsNote: SIGNALS_NOTE,
  };

  // The safety gate is authoritative. Intent does not override it.
  if (!fertilityVisible || !cycleMap) {
    return {
      ...base,
      blockedTitle: "Luma can't estimate your dates reliably yet",
      blockedDetail: cycleMap
        ? fertilitySafety.detail
        : 'Luma needs more recorded period starts before it can estimate a fertile window from your history.',
    };
  }

  return {
    ...base,
    datesAvailable: true,
    fertileWindow: {
      start: cycleMap.fertileWindowStart,
      end: cycleMap.fertileWindowEnd,
    },
    higherOpportunityWindow: higherOpportunityWindow(cycleMap),
    estimateCaveat: ESTIMATE_CAVEAT,
  };
}
