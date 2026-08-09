import type {
  AccentTheme,
  AppearancePrefs,
  BleedingType,
  ContraceptionType,
  CycleContext,
  CycleRegularity,
  DailyLog,
  DevicePrefs,
  NotificationPrefs,
  PeriodEpisode,
  PreparationItem,
  Profile,
  TrackingGoal,
} from '@/types';

export type AuthStatus =
  | 'loading'
  | 'signed_out'
  | 'signing_in'
  | 'signing_up'
  | 'oauth_redirect'
  | 'account_created'
  | 'sending_link'
  | 'link_sent'
  | 'verifying'
  | 'hydrating'
  | 'signed_in'
  | 'error';

export type SyncStatus =
  'idle' | 'hydrating' | 'saving' | 'saved' | 'offline' | 'error';

export interface AuthSession {
  userId: string;
  email?: string;
  expiresAt?: number;
}

export interface CloudProfileRow {
  user_id: string;
  display_name: string | null;
  timezone: string;
  locale: string;
  onboarding_complete: boolean;
  tracking_goals: TrackingGoal[];
  last_period_start_date: string | null;
  usual_period_length: number | null;
  cycle_regularity: CycleRegularity | null;
  contraception_type: ContraceptionType | null;
  safety_contexts: CycleContext[] | null;
  safety_context_reviewed: boolean | null;
  fertility_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CloudPeriodEpisodeRow {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string | null;
  source: PeriodEpisode['source'];
  manually_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CloudDailyLogRow {
  id: string;
  user_id: string;
  date: string;
  flow: DailyLog['flow'] | null;
  bleeding_type: BleedingType | null;
  mood: DailyLog['mood'] | null;
  energy: DailyLog['energy'] | null;
  pain: DailyLog['pain'] | null;
  pain_locations: DailyLog['painLocations'] | null;
  symptoms: string[] | null;
  sleep_hours: number | null;
  note: string | null;
  updated_at: string;
}

export interface CloudPreparationItemRow {
  id: string;
  user_id: string;
  label: string;
  checked: boolean;
  updated_at: string;
}

export interface CloudPreferencesRow {
  user_id: string;
  color_mode: AppearancePrefs['colorMode'];
  accent: AccentTheme;
  discreet_mode: boolean;
  notification_preferences: NotificationPrefs;
  favourite_symptoms: string[];
  updated_at: string;
}

export interface HydratedCloudAccount {
  profile: Profile | null;
  periodEpisodes: PeriodEpisode[];
  dailyLogs: Record<string, DailyLog>;
  preparationItems: PreparationItem[];
  appearance: AppearancePrefs | null;
  notifications: NotificationPrefs | null;
  favouriteSymptoms: string[] | null;
}

export type AccountDeviceState = DevicePrefs;
