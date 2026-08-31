import type {
  ContraceptionType,
  FertilityEstimateAvailability,
  Profile,
} from '@/types';
import { MENSTRUAL_REFERENCE } from '@/health/menstrualHealth';

/**
 * Calendar timing is intentionally conservative. These methods can affect
 * ovulation, bleeding, or how cycle signs should be interpreted, so Luma does
 * not turn a prediction into a fertility-risk calculation.
 */
const HORMONAL_CONTRACEPTION = new Set<ContraceptionType>([
  'combined_pill',
  'pop',
  'hormonal_iud',
  'implant',
  'injection',
  'patch',
  'ring',
]);

const CONTEXTS_WITHOUT_CALENDAR_ESTIMATES = new Set([
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

const CONTEXTS_WITHOUT_PERIOD_PREDICTIONS = new Set([
  'possible_pregnancy',
  'postpartum',
  'breastfeeding',
  'contraception_transition',
  'perimenopause',
  'early_menarche',
  'recent_pregnancy_loss_or_abortion',
  'hysterectomy_or_ovarian_surgery',
  'prefer_not_to_say',
]);

export interface PeriodPredictionSafety {
  canShow: boolean;
  title: string;
  detail: string;
}

export interface FertilitySafety {
  availability: FertilityEstimateAvailability;
  canShow: boolean;
  title: string;
  detail: string;
}

export function isHormonalContraception(type?: ContraceptionType): boolean {
  return !!type && HORMONAL_CONTRACEPTION.has(type);
}

export function periodPredictionSafety(
  profile: Profile,
): PeriodPredictionSafety {
  if (profile.safetyContextReviewed !== true) {
    return {
      canShow: false,
      title: 'Review your cycle context first',
      detail:
        'Luma keeps date predictions hidden until the situations that can change bleeding timing have been reviewed.',
    };
  }

  if (isHormonalContraception(profile.contraceptionType)) {
    return {
      canShow: false,
      title: 'Track bleeding without a natural-cycle prediction',
      detail:
        'Hormonal contraception can change or suppress ovulation and bleeding. Luma does not know your dosing schedule, so it will record bleeding without predicting a natural period.',
    };
  }

  const contexts = profile.safetyContexts ?? [];
  if (
    contexts.some((context) => CONTEXTS_WITHOUT_PERIOD_PREDICTIONS.has(context))
  ) {
    const possiblePregnancy = contexts.includes('possible_pregnancy');
    return {
      canShow: false,
      title: possiblePregnancy
        ? 'A calendar cannot rule out pregnancy'
        : 'Date predictions are paused for this cycle context',
      detail: possiblePregnancy
        ? 'If a period is late and pregnancy is possible, follow the test instructions. U.S. Office on Women’s Health guidance says most home tests are more accurate after the first day of a missed period; with irregular cycles, test about 36 days after the last period began or 4 weeks after sex. Seek urgent care for severe pain, fainting, or heavy bleeding.'
        : 'This context can change bleeding or ovulation in ways a date-only model cannot interpret. Luma will keep recording what happens without presenting a next-period window.',
    };
  }

  return {
    canShow: true,
    title: 'Estimated next-period window',
    detail:
      'This range comes from recorded period starts. It can shift and does not explain why a cycle changes.',
  };
}

export function fertilityEstimateSafety(
  profile: Profile,
  completedCycles: number,
  recentCycleLengths: number[] = [],
): FertilitySafety {
  if (profile.safetyContextReviewed !== true) {
    return {
      availability: 'context_not_reviewed',
      canShow: false,
      title: 'Review your cycle context first',
      detail:
        'Luma keeps fertile timing hidden until you review the situations that can make a calendar estimate unreliable.',
    };
  }

  if (
    !profile.contraceptionType ||
    profile.contraceptionType === 'other' ||
    profile.contraceptionType === 'prefer_not'
  ) {
    return {
      availability: 'contraception_not_reviewed',
      canShow: false,
      title: 'Confirm your contraception context first',
      detail:
        'Luma needs to know whether bleeding may be withdrawal or breakthrough bleeding before it can show calendar fertile timing.',
    };
  }

  if (isHormonalContraception(profile.contraceptionType)) {
    return {
      availability: 'hormonal_contraception',
      canShow: false,
      title: 'Fertile timing is unavailable with hormonal contraception',
      detail:
        'Hormonal contraception can suppress ovulation and change bleeding. Luma can still record bleeding and symptoms, but it will not calculate fertile days.',
    };
  }

  const contexts = profile.safetyContexts ?? [];
  if (
    contexts.some((context) => CONTEXTS_WITHOUT_CALENDAR_ESTIMATES.has(context))
  ) {
    return {
      availability: 'cycle_context_unreliable',
      canShow: false,
      title: 'Fertile timing is unavailable for this cycle context',
      detail:
        'This context can make calendar timing unreliable. Luma will continue showing recorded bleeding and symptoms without presenting fertile-day estimates.',
    };
  }

  if (profile.cycleRegularity !== 'usually') {
    return {
      availability: 'cycle_context_unreliable',
      canShow: false,
      title: 'Fertile timing needs a steadier cycle pattern',
      detail:
        'Because your cycles are not consistently regular, Luma will not present calendar fertile-day estimates. A calendar cannot determine pregnancy risk.',
    };
  }

  if (recentCycleLengths.length >= 3) {
    const recent = recentCycleLengths.slice(-6);
    const observedSpread = Math.max(...recent) - Math.min(...recent);
    const standardDaysRange = MENSTRUAL_REFERENCE.standardDaysMethodCycleDays;
    if (
      recent.some(
        (length) =>
          length < standardDaysRange.min || length > standardDaysRange.max,
      ) ||
      observedSpread > 7
    ) {
      return {
        availability: 'cycle_context_unreliable',
        canShow: false,
        title:
          'Recent cycle dates are too variable for calendar fertility timing',
        detail: `The calendar method behind this optional view is intended only when recent cycles stay between ${standardDaysRange.min} and ${standardDaysRange.max} days. Your recorded dates do not meet that conservative boundary, so Luma keeps timing hidden. A calendar cannot determine pregnancy risk.`,
      };
    }
  }

  if (completedCycles < 3) {
    return {
      availability: 'insufficient_history',
      canShow: false,
      title: 'Keep logging before fertile timing appears',
      detail:
        'Luma needs at least 3 completed cycles before it can show a broad calendar estimate. Period timing remains available while your history builds.',
    };
  }

  const copperNote =
    profile.contraceptionType === 'copper_iud'
      ? ' A copper IUD can change bleeding patterns, so keep the estimate especially cautious.'
      : '';

  return {
    availability: 'available',
    canShow: true,
    title: 'Possible fertile timing',
    detail: `Cycle dates alone cannot confirm ovulation. This is a broad calendar-only estimate, not contraception, a pregnancy-risk calculation, or a substitute for current-cycle markers such as cervical mucus, LH testing, or temperature tracking.${copperNote}`,
  };
}

/**
 * Whether the person can do anything about fertile timing being hidden.
 * Every reason except `insufficient_history` traces back to a field they can
 * edit in the health profile — contraception, regularity, safety contexts, or
 * the toggle itself. Insufficient history clears only by logging more cycles,
 * so offering a settings link there would send someone to a screen with no
 * control that helps. Presentation reads this to decide whether the ring's
 * absence note is a tap target or a plain statement.
 */
export function fertilityAbsenceIsResolvable(
  availability: FertilityEstimateAvailability,
): boolean {
  return availability !== 'insufficient_history';
}

export function fertilityEstimateVisible(
  profile: Profile,
  completedCycles: number,
  recentCycleLengths: number[] = [],
): boolean {
  return (
    profile.fertilityEnabled &&
    fertilityEstimateSafety(profile, completedCycles, recentCycleLengths)
      .canShow
  );
}
