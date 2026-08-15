import { create } from 'zustand';
import { getConfiguredAppwriteAccount } from '@/auth/appwrite';
import { createId } from '@/utils/id';
import { inferPeriodEpisodes } from '@/engine/cycle';
import { toLocalDateString } from '@/utils/dates';
import type {
  AppearancePrefs,
  ContraceptionType,
  CycleRegularity,
  DailyLog,
  EnergyLevel,
  FlowLevel,
  MoodLevel,
  NotificationPrefs,
  PainLevel,
  PainLocation,
  PeriodEpisode,
  PreparationItem,
  Profile,
  CycleContext,
  TrackingGoal,
} from '@/types';
import type { SyncStatus } from '@/sync/types';
import { isConnectionAvailable, isOfflineFailure } from '@/sync/network';
import {
  DEFAULT_PREPARATION,
  deleteAccountRemotely,
  deleteDailyLogAndSyncEpisodes,
  hydrateCloudAccount,
  saveDailyLogAndEpisodes,
  saveManualPeriod,
  saveOnboarding,
  savePreferences,
  savePreparationItem,
  saveProfile,
} from '@/sync/lumaRepository';

export const defaultProfile = (): Profile => ({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  locale: 'en',
  onboardingComplete: false,
  trackingGoals: [],
  safetyContexts: [],
  safetyContextReviewed: false,
  fertilityEnabled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const defaultAppearance = (): AppearancePrefs => ({
  colorMode: 'system',
  // Dust Rose, not Sage: the first thing anyone sees should be warm. A green
  // accent on a dark ground reads as developer tooling rather than a personal
  // health journal.
  accent: 'dust_rose',
  discreetMode: false,
});

export const defaultNotifications = (): NotificationPrefs => ({
  periodPrediction: true,
  periodPreparation: true,
  dailyLog: false,
  patternDiscovered: true,
  importantChange: true,
  showDetailedText: false,
});

export const defaultPreparation = (): PreparationItem[] =>
  DEFAULT_PREPARATION.map((item) => ({ ...item }));

const defaultFavouriteSymptoms = () => [
  'cramps',
  'headache',
  'bloating',
  'cravings',
  'irritability',
  'poor_sleep',
];

export interface OnboardingDraft {
  trackingGoals: TrackingGoal[];
  lastPeriodStartDate?: string;
  usualPeriodLength?: number;
  cycleRegularity?: CycleRegularity;
  contraceptionType?: ContraceptionType;
  safetyContexts?: CycleContext[];
  safetyContextReviewed?: boolean;
}

export interface LumaStore {
  profile: Profile;
  appearance: AppearancePrefs;
  notifications: NotificationPrefs;
  preparationItems: PreparationItem[];
  periodEpisodes: PeriodEpisode[];
  dailyLogs: Record<string, DailyLog>;
  favouriteSymptoms: string[];
  onboardingDraft: OnboardingDraft;
  cloudUserId?: string;
  hydrated: boolean;
  syncStatus: SyncStatus;
  syncError?: string;

  setHydrated: (value: boolean) => void;
  patchOnboardingDraft: (patch: Partial<OnboardingDraft>) => void;
  hydrateAccount: (userId: string) => Promise<void>;
  resetCloudState: () => void;
  clearSyncError: () => void;
  completeOnboarding: (input?: {
    trackingGoals?: TrackingGoal[];
    lastPeriodStartDate?: string;
    usualPeriodLength?: number;
    cycleRegularity?: CycleRegularity;
    contraceptionType?: ContraceptionType;
    safetyContexts?: CycleContext[];
    safetyContextReviewed?: boolean;
    displayName?: string;
  }) => Promise<boolean>;
  updateProfile: (patch: Partial<Profile>) => Promise<boolean>;
  updateAppearance: (patch: Partial<AppearancePrefs>) => Promise<boolean>;
  updateNotifications: (patch: Partial<NotificationPrefs>) => Promise<boolean>;
  setPreparationItem: (id: string, checked: boolean) => Promise<boolean>;
  upsertDailyLog: (
    date: string,
    patch: Partial<Omit<DailyLog, 'id' | 'date' | 'updatedAt'>> & {
      flow?: FlowLevel;
      mood?: MoodLevel;
      energy?: EnergyLevel;
      pain?: PainLevel;
      painLocations?: PainLocation[];
    },
  ) => Promise<boolean>;
  deleteDailyLog: (date: string) => Promise<boolean>;
  addManualPeriod: (startDate: string, endDate?: string) => Promise<boolean>;
  setFavouriteSymptoms: (codes: string[]) => Promise<boolean>;
  signOutAccount: () => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
}

function addDaysSafe(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export const useLumaStore = create<LumaStore>()((set, get) => {
  const applyAccount = (
    userId: string,
    account: Awaited<ReturnType<typeof hydrateCloudAccount>>,
  ) => {
    set({
      cloudUserId: userId,
      profile: account.profile ?? defaultProfile(),
      appearance: account.appearance ?? defaultAppearance(),
      notifications: account.notifications ?? defaultNotifications(),
      preparationItems: account.preparationItems.length
        ? account.preparationItems
        : defaultPreparation(),
      periodEpisodes: account.periodEpisodes,
      dailyLogs: account.dailyLogs,
      favouriteSymptoms:
        account.favouriteSymptoms ?? defaultFavouriteSymptoms(),
      onboardingDraft: { trackingGoals: [] },
      hydrated: true,
      syncStatus: 'saved',
      syncError: undefined,
    });
  };

  const remote = async <T>(
    work: (userId: string) => Promise<T>,
  ): Promise<T | undefined> => {
    const userId = get().cloudUserId;
    if (!userId) {
      set({
        syncStatus: 'error',
        syncError: 'Sign in is required before saving cycle data.',
      });
      return undefined;
    }
    if (!(await isConnectionAvailable())) {
      set({
        syncStatus: 'offline',
        syncError: 'Not saved — internet required',
      });
      return undefined;
    }

    set({ syncStatus: 'saving', syncError: undefined });
    try {
      const result = await work(userId);
      set({ syncStatus: 'saved', syncError: undefined });
      return result;
    } catch (error) {
      set({
        syncStatus: isOfflineFailure(error) ? 'offline' : 'error',
        syncError: isOfflineFailure(error)
          ? 'Not saved — internet required'
          : error instanceof Error
            ? error.message
            : 'Not saved — please try again.',
      });
      return undefined;
    }
  };

  return {
    profile: defaultProfile(),
    appearance: defaultAppearance(),
    notifications: defaultNotifications(),
    preparationItems: defaultPreparation(),
    periodEpisodes: [],
    dailyLogs: {},
    favouriteSymptoms: defaultFavouriteSymptoms(),
    onboardingDraft: { trackingGoals: [] },
    hydrated: false,
    syncStatus: 'idle',
    setHydrated: (value) => set({ hydrated: value }),
    patchOnboardingDraft: (patch) =>
      set({ onboardingDraft: { ...get().onboardingDraft, ...patch } }),

    hydrateAccount: async (userId) => {
      set({
        cloudUserId: userId,
        hydrated: false,
        syncStatus: 'hydrating',
        syncError: undefined,
      });
      try {
        const account = await hydrateCloudAccount(
          getConfiguredAppwriteAccount(),
          userId,
        );
        applyAccount(userId, account);
      } catch (error) {
        set({
          hydrated: false,
          syncStatus: isOfflineFailure(error) ? 'offline' : 'error',
          syncError: isOfflineFailure(error)
            ? 'Not saved — internet required'
            : error instanceof Error
              ? error.message
              : 'Could not load your account data.',
        });
        throw error;
      }
    },

    resetCloudState: () =>
      set({
        cloudUserId: undefined,
        profile: defaultProfile(),
        appearance: defaultAppearance(),
        notifications: defaultNotifications(),
        preparationItems: defaultPreparation(),
        periodEpisodes: [],
        dailyLogs: {},
        favouriteSymptoms: defaultFavouriteSymptoms(),
        onboardingDraft: { trackingGoals: [] },
        hydrated: false,
        syncStatus: 'idle',
        syncError: undefined,
      }),
    clearSyncError: () => set({ syncError: undefined, syncStatus: 'idle' }),

    completeOnboarding: async (input = {}) => {
      const draft = { ...get().onboardingDraft, ...input };
      const trackingGoals = draft.trackingGoals ?? [];
      const now = new Date().toISOString();
      const profile: Profile = {
        ...get().profile,
        trackingGoals,
        lastPeriodStartDate: draft.lastPeriodStartDate,
        usualPeriodLength: draft.usualPeriodLength,
        cycleRegularity: draft.cycleRegularity,
        contraceptionType: draft.contraceptionType,
        safetyContexts: draft.safetyContexts ?? [],
        safetyContextReviewed: draft.safetyContextReviewed ?? false,
        displayName: input.displayName ?? get().profile.displayName,
        fertilityEnabled: trackingGoals.includes('trying_to_conceive'),
        onboardingComplete: true,
        updatedAt: now,
      };

      let episodes: PeriodEpisode[] = [];
      let logs: Record<string, DailyLog> = {};
      if (draft.lastPeriodStartDate) {
        const start = draft.lastPeriodStartDate;
        const length = draft.usualPeriodLength ?? 5;
        episodes = [
          {
            id: createId(),
            startDate: start,
            endDate: undefined,
            source: 'manual',
            manuallyConfirmed: true,
          },
        ];
        for (let i = 0; i < Math.min(length, 5); i++) {
          const date = addDaysSafe(start, i);
          if (date > toLocalDateString()) break;
          logs[date] = {
            id: createId(),
            date,
            flow: i === 1 ? 'heavy' : i === 0 ? 'medium' : 'light',
            bleedingType: 'natural_period',
            updatedAt: now,
          };
        }
        episodes = inferPeriodEpisodes(episodes, logs);
      }

      const account = await remote(async (userId) => {
        const account = getConfiguredAppwriteAccount();
        return saveOnboarding(
          account,
          userId,
          profile,
          episodes,
          logs,
          get().appearance,
          get().notifications,
          get().favouriteSymptoms,
        );
      });
      if (!account) return false;
      applyAccount(get().cloudUserId!, account);
      return true;
    },

    updateProfile: async (patch) => {
      const next = {
        ...get().profile,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      const saved = await remote(async (userId) =>
        saveProfile(getConfiguredAppwriteAccount(), userId, next),
      );
      if (!saved) return false;
      set({ profile: saved });
      return true;
    },

    updateAppearance: async (patch) => {
      const next = { ...get().appearance, ...patch };
      const saved = await remote(async (userId) =>
        savePreferences(
          getConfiguredAppwriteAccount(),
          userId,
          next,
          get().notifications,
          get().favouriteSymptoms,
        ),
      );
      if (!saved) return false;
      set({
        appearance: saved.appearance,
        notifications: saved.notifications,
        favouriteSymptoms: saved.favouriteSymptoms,
      });
      return true;
    },

    updateNotifications: async (patch) => {
      const next = { ...get().notifications, ...patch };
      const saved = await remote(async (userId) =>
        savePreferences(
          getConfiguredAppwriteAccount(),
          userId,
          get().appearance,
          next,
          get().favouriteSymptoms,
        ),
      );
      if (!saved) return false;
      set({
        appearance: saved.appearance,
        notifications: saved.notifications,
        favouriteSymptoms: saved.favouriteSymptoms,
      });
      return true;
    },

    setPreparationItem: async (id, checked) => {
      const current = get().preparationItems.find((item) => item.id === id);
      if (!current) return false;
      const item = { ...current, checked };
      const saved = await remote(async (userId) =>
        savePreparationItem(getConfiguredAppwriteAccount(), userId, item),
      );
      if (!saved) return false;
      set({
        preparationItems: get().preparationItems.map((entry) =>
          entry.id === saved.id ? saved : entry,
        ),
      });
      return true;
    },

    upsertDailyLog: async (date, patch) => {
      const existing = get().dailyLogs[date];
      const log: DailyLog = {
        ...existing,
        ...patch,
        id: existing?.id ?? createId(),
        date,
        updatedAt: new Date().toISOString(),
      };
      const dailyLogs = { ...get().dailyLogs, [date]: log };
      const episodes = inferPeriodEpisodes(get().periodEpisodes, dailyLogs);
      const saved = await remote(async (userId) =>
        saveDailyLogAndEpisodes(
          getConfiguredAppwriteAccount(),
          userId,
          log,
          episodes,
          get().periodEpisodes,
        ),
      );
      if (!saved) return false;
      set({
        dailyLogs: { ...get().dailyLogs, [saved.log.date]: saved.log },
        periodEpisodes: saved.episodes,
      });
      return true;
    },

    deleteDailyLog: async (date) => {
      const dailyLogs = { ...get().dailyLogs };
      delete dailyLogs[date];
      const episodes = inferPeriodEpisodes(get().periodEpisodes, dailyLogs);
      const saved = await remote(async (userId) =>
        deleteDailyLogAndSyncEpisodes(
          getConfiguredAppwriteAccount(),
          userId,
          date,
          episodes,
          get().periodEpisodes,
        ),
      );
      if (!saved) return false;
      set({ dailyLogs, periodEpisodes: saved });
      return true;
    },

    addManualPeriod: async (startDate, endDate) => {
      const previous = get().periodEpisodes;
      const existing = previous.find(
        (episode) => episode.startDate === startDate,
      );
      const episodes = [
        ...previous.filter((episode) => episode.startDate !== startDate),
        {
          id: existing?.id ?? createId(),
          startDate,
          endDate,
          source: 'manual' as const,
          manuallyConfirmed: true,
        },
      ].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const saved = await remote(async (userId) =>
        saveManualPeriod(
          getConfiguredAppwriteAccount(),
          userId,
          episodes,
          previous,
        ),
      );
      if (!saved) return false;
      set({ periodEpisodes: saved });
      return true;
    },

    setFavouriteSymptoms: async (codes) => {
      const saved = await remote(async (userId) =>
        savePreferences(
          getConfiguredAppwriteAccount(),
          userId,
          get().appearance,
          get().notifications,
          codes,
        ),
      );
      if (!saved) return false;
      set({
        appearance: saved.appearance,
        notifications: saved.notifications,
        favouriteSymptoms: saved.favouriteSymptoms,
      });
      return true;
    },

    signOutAccount: async () => {
      try {
          await getConfiguredAppwriteAccount().deleteSession({
            sessionId: 'current',
          });
        get().resetCloudState();
        return true;
      } catch (error) {
        set({
          syncStatus: 'error',
          syncError:
            error instanceof Error ? error.message : 'Could not sign out.',
        });
        return false;
      }
    },

    deleteAccount: async () => {
      const deleted = await remote(async () => {
        const account = getConfiguredAppwriteAccount();
        await deleteAccountRemotely(account);
        return true;
      });
      if (!deleted) return false;
      get().resetCloudState();
      return true;
    },
  };
});

// Kept as a named export to make the one-time legacy boundary explicit. The
// account-first store never reads the old `luma-store-v1` AsyncStorage key.
export { LEGACY_STORE_KEY as legacyStoreKey } from './legacyMigration';
