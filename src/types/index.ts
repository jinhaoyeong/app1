export type TrackingGoal =
  | 'predict_period'
  | 'understand_symptoms'
  | 'understand_mood'
  | 'understand_energy'
  | 'prepare_period'
  | 'reproductive_health'
  | 'trying_to_conceive';

export type CycleRegularity = 'usually' | 'sometimes' | 'rarely' | 'unsure';

export type ContraceptionType =
  | 'none'
  | 'combined_pill'
  | 'pop'
  | 'hormonal_iud'
  | 'copper_iud'
  | 'implant'
  | 'injection'
  | 'patch'
  | 'ring'
  | 'other'
  | 'prefer_not';

/** Contexts that can make calendar-based fertility estimates unreliable. */
export type CycleContext =
  | 'possible_pregnancy'
  | 'postpartum'
  | 'breastfeeding'
  | 'contraception_transition'
  | 'perimenopause'
  | 'early_menarche'
  | 'pcos_or_thyroid'
  | 'endometriosis_or_adenomyosis'
  | 'bleeding_disorder'
  | 'recent_pregnancy_loss_or_abortion'
  | 'hysterectomy_or_ovarian_surgery'
  | 'bleeding_affecting_medication'
  | 'none'
  | 'prefer_not_to_say';

/** What a logged bleeding event may represent. */
export type BleedingType =
  | 'natural_period'
  | 'withdrawal'
  | 'breakthrough'
  | 'spotting'
  | 'post_sex'
  | 'unknown';

export type FlowLevel =
  'none' | 'spotting' | 'light' | 'medium' | 'heavy' | 'very_heavy';

export type MoodLevel = 'great' | 'good' | 'okay' | 'low' | 'rough';

export type EnergyLevel = 'very_low' | 'low' | 'normal' | 'high' | 'very_high';

export type PainLevel = 'none' | 'mild' | 'moderate' | 'severe';

export type PainLocation =
  'cramps' | 'back' | 'head' | 'breasts' | 'pelvic' | 'other';

export type AccentTheme =
  'dust_rose' | 'lavender' | 'sage' | 'ocean' | 'sand' | 'plum';

export type ColorMode = 'system' | 'light' | 'dark';

export type ConfidenceBand = 'high' | 'moderate' | 'lower' | 'learning';

export type FertilityEstimateAvailability =
  | 'available'
  | 'disabled'
  | 'context_not_reviewed'
  | 'contraception_not_reviewed'
  | 'insufficient_history'
  | 'hormonal_contraception'
  | 'cycle_context_unreliable';

export type PatternStrength =
  'insufficient' | 'possible' | 'repeating' | 'strong';

export type SafetyLevel = 0 | 1 | 2 | 3 | 4;

export type InsightType =
  | 'prediction'
  | 'personal_pattern'
  | 'preparation'
  | 'change'
  | 'education'
  | 'positive'
  | 'learning';

export interface Profile {
  displayName?: string;
  timezone: string;
  locale: string;
  onboardingComplete: boolean;
  trackingGoals: TrackingGoal[];
  lastPeriodStartDate?: string; // YYYY-MM-DD
  usualPeriodLength?: number;
  cycleRegularity?: CycleRegularity;
  contraceptionType?: ContraceptionType;
  safetyContexts?: CycleContext[];
  safetyContextReviewed?: boolean;
  fertilityEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppearancePrefs {
  colorMode: ColorMode;
  accent: AccentTheme;
  discreetMode: boolean;
}

/** Preferences that belong to this physical device, never to the account. */
export interface DevicePrefs {
  biometricLock: boolean;
  biometricTimeout: 'immediate' | '1m' | '5m';
}

export interface NotificationPrefs {
  periodPrediction: boolean;
  periodPreparation: boolean;
  dailyLog: boolean;
  patternDiscovered: boolean;
  importantChange: boolean;
  showDetailedText: boolean;
}

export interface PreparationItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface PeriodEpisode {
  id: string;
  startDate: string;
  endDate?: string;
  source: 'manual' | 'inferred' | 'imported';
  manuallyConfirmed: boolean;
  bleedingType?: BleedingType;
}

export interface DailyLog {
  id: string;
  date: string; // local calendar date YYYY-MM-DD
  flow?: FlowLevel;
  bleedingType?: BleedingType;
  mood?: MoodLevel;
  energy?: EnergyLevel;
  pain?: PainLevel;
  painLocations?: PainLocation[];
  symptoms?: string[];
  sleepHours?: number;
  note?: string;
  updatedAt: string;
}

export interface PeriodPrediction {
  predictedStart: string;
  lowerBound: string;
  upperBound: string;
  confidence: number;
  confidenceBand: ConfidenceBand;
  algorithmVersion: string;
  explanation: string;
  daysUntilLower?: number;
  daysUntilUpper?: number;
}

export interface PersonalBaseline {
  cycleCount: number;
  averageCycleLength?: number;
  medianCycleLength?: number;
  cycleLengthRange?: [number, number];
  cycleVariation?: number;
  averagePeriodLength?: number;
  ready: boolean;
  message: string;
}

export interface PersonalPattern {
  id: string;
  patternType: string;
  targetCode: string;
  title: string;
  body: string;
  windowStart?: number;
  windowEnd?: number;
  supportCount: number;
  totalCycles: number;
  strength: PatternStrength;
  evidence: string[];
  active: boolean;
}

export interface ChangeInsight {
  id: string;
  title: string;
  body: string;
  safetyLevel: SafetyLevel;
  kind: string;
}

export interface TodayInsight {
  type: InsightType;
  title: string;
  body: string;
  meta?: string;
  actionLabel?: string;
  actionHref?: string;
  safetyLevel: SafetyLevel;
  confidence?: PatternStrength | ConfidenceBand;
  relatedPatternId?: string;
}

export interface CycleSummaryRow {
  startDate: string;
  endDate?: string;
  length?: number;
  periodLength?: number;
  mainDifference?: string;
}

export interface HealthSummary {
  months: number;
  generatedAt: string;
  averageCycle?: number;
  cycleRange?: [number, number];
  averageBleeding?: number;
  heaviestFlowDay?: string;
  painSummary?: string;
  moodSummary?: string;
  commonSymptoms: {
    code: string;
    label: string;
    count: number;
    total: number;
  }[];
  changes: string[];
}

export interface AppState {
  profile: Profile;
  appearance: AppearancePrefs;
  notifications: NotificationPrefs;
  preparationItems: PreparationItem[];
  periodEpisodes: PeriodEpisode[];
  dailyLogs: Record<string, DailyLog>;
  favouriteSymptoms: string[];
  hydrated: boolean;
}
