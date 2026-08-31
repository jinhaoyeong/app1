import type {
  AppearancePrefs,
  DailyLog,
  NotificationPrefs,
  PeriodEpisode,
  PreparationItem,
  Profile,
} from '@/types';
import type {
  CloudDailyLogRow,
  CloudPeriodEpisodeRow,
  CloudPreferencesRow,
  CloudPreparationItemRow,
  CloudProfileRow,
} from './types';

export function profileToCloudRow(
  userId: string,
  profile: Profile,
): CloudProfileRow {
  return {
    user_id: userId,
    display_name: profile.displayName ?? null,
    timezone: profile.timezone,
    locale: profile.locale,
    onboarding_complete: profile.onboardingComplete,
    tracking_goals: profile.trackingGoals,
    last_period_start_date: profile.lastPeriodStartDate ?? null,
    usual_period_length: profile.usualPeriodLength ?? null,
    cycle_regularity: profile.cycleRegularity ?? null,
    contraception_type: profile.contraceptionType ?? null,
    safety_contexts: profile.safetyContexts ?? [],
    safety_context_reviewed: profile.safetyContextReviewed ?? false,
    fertility_enabled: profile.fertilityEnabled,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

export function profileFromCloudRow(row: CloudProfileRow): Profile {
  return {
    displayName: row.display_name ?? undefined,
    timezone: row.timezone,
    locale: row.locale,
    onboardingComplete: row.onboarding_complete,
    trackingGoals: row.tracking_goals ?? [],
    lastPeriodStartDate: row.last_period_start_date ?? undefined,
    usualPeriodLength: row.usual_period_length ?? undefined,
    cycleRegularity: row.cycle_regularity ?? undefined,
    contraceptionType: row.contraception_type ?? undefined,
    safetyContexts: row.safety_contexts ?? [],
    safetyContextReviewed: row.safety_context_reviewed ?? false,
    fertilityEnabled: row.fertility_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function episodeToCloudRow(
  userId: string,
  episode: PeriodEpisode,
): CloudPeriodEpisodeRow {
  const now = new Date().toISOString();
  return {
    id: episode.id,
    user_id: userId,
    start_date: episode.startDate,
    end_date: episode.endDate ?? null,
    source: episode.source,
    manually_confirmed: episode.manuallyConfirmed,
    created_at: now,
    updated_at: now,
  };
}

export function episodeFromCloudRow(row: CloudPeriodEpisodeRow): PeriodEpisode {
  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    source: row.source,
    manuallyConfirmed: row.manually_confirmed,
  };
}

export function dailyLogToCloudRow(
  userId: string,
  log: DailyLog,
): CloudDailyLogRow {
  return {
    id: log.id,
    user_id: userId,
    date: log.date,
    flow: log.flow ?? null,
    bleeding_type: log.bleedingType ?? null,
    mood: log.mood ?? null,
    energy: log.energy ?? null,
    pain: log.pain ?? null,
    pain_locations: log.painLocations ?? null,
    symptoms: log.symptoms ?? null,
    sleep_hours: log.sleepHours ?? null,
    lh_test: log.lhTest ?? null,
    mucus: log.mucus ?? null,
    sexual_activity: log.sexualActivity ?? null,
    functional_impact: log.functionalImpact ?? null,
    note: log.note ?? null,
    updated_at: log.updatedAt,
  };
}

export function dailyLogFromCloudRow(row: CloudDailyLogRow): DailyLog {
  return {
    id: row.id,
    date: row.date,
    flow: row.flow ?? undefined,
    bleedingType: row.bleeding_type ?? undefined,
    mood: row.mood ?? undefined,
    energy: row.energy ?? undefined,
    pain: row.pain ?? undefined,
    painLocations: row.pain_locations ?? undefined,
    symptoms: row.symptoms ?? undefined,
    sleepHours: row.sleep_hours ?? undefined,
    lhTest: row.lh_test ?? undefined,
    mucus: row.mucus ?? undefined,
    sexualActivity: row.sexual_activity ?? undefined,
    functionalImpact: row.functional_impact ?? undefined,
    note: row.note ?? undefined,
    updatedAt: row.updated_at,
  };
}

export function preparationToCloudRow(
  userId: string,
  item: PreparationItem,
): CloudPreparationItemRow {
  return {
    id: item.id,
    user_id: userId,
    label: item.label,
    checked: item.checked,
    updated_at: new Date().toISOString(),
  };
}

export function preparationFromCloudRow(
  row: CloudPreparationItemRow,
): PreparationItem {
  return { id: row.id, label: row.label, checked: row.checked };
}

export function preferencesToCloudRow(
  userId: string,
  appearance: AppearancePrefs,
  notifications: NotificationPrefs,
  favouriteSymptoms: string[],
): CloudPreferencesRow {
  return {
    user_id: userId,
    color_mode: appearance.colorMode,
    accent: appearance.accent,
    discreet_mode: appearance.discreetMode,
    notification_preferences: notifications,
    favourite_symptoms: favouriteSymptoms,
    updated_at: new Date().toISOString(),
  };
}

export function preferencesFromCloudRow(row: CloudPreferencesRow): {
  appearance: AppearancePrefs;
  notifications: NotificationPrefs;
  favouriteSymptoms: string[];
} {
  return {
    appearance: {
      colorMode: row.color_mode,
      accent: row.accent,
      discreetMode: row.discreet_mode,
    },
    notifications: row.notification_preferences,
    favouriteSymptoms: row.favourite_symptoms ?? [],
  };
}
