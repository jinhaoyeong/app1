import type {
  ContraceptionType,
  FertilityEstimateAvailability,
  Profile,
} from '@/types';

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

export interface FertilitySafety {
  availability: FertilityEstimateAvailability;
  canShow: boolean;
  title: string;
  detail: string;
}

export function isHormonalContraception(type?: ContraceptionType): boolean {
  return !!type && HORMONAL_CONTRACEPTION.has(type);
}

export function fertilityEstimateSafety(
  profile: Profile,
  completedCycles: number,
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
    detail: `This is a broad calendar estimate based on your logged cycles, not an exact ovulation date, contraception, or a pregnancy-risk calculation.${copperNote}`,
  };
}

export function fertilityEstimateVisible(
  profile: Profile,
  completedCycles: number,
): boolean {
  return (
    profile.fertilityEnabled &&
    fertilityEstimateSafety(profile, completedCycles).canShow
  );
}
