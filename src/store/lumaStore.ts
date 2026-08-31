import { create } from 'zustand';
import { getConfiguredAppwriteAccount } from '@/auth/appwrite';
import { createId } from '@/utils/id';
import { createInitialCycleHistory, inferPeriodEpisodes } from '@/engine/cycle';
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
import type { HydratedCloudAccount, SyncStatus } from '@/sync/types';
import { isConnectionAvailable, isOfflineFailure } from '@/sync/network';
import {
  enqueueOutbox,
  flushOutbox,
  isNewerIso,
  loadAccountCache,
  loadOutbox,
  PENDING_SYNC_COPY,
  saveAccountCache,
  wipeSignedInLocal,
  type OutboxOp,
  type OutboxOpInput,
} from '@/sync/outbox';
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
  flushPending: () => Promise<void>;
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

  const snapshot = (): HydratedCloudAccount => {
    const state = get();
    return {
      profile: state.profile,
      periodEpisodes: state.periodEpisodes,
      dailyLogs: state.dailyLogs,
      preparationItems: state.preparationItems,
      appearance: state.appearance,
      notifications: state.notifications,
      favouriteSymptoms: state.favouriteSymptoms,
    };
  };

  const persistSlice = async (userId: string) => {
    await saveAccountCache(userId, snapshot());
  };

  const markPending = () => {
    set({
      syncStatus: 'offline',
      syncError: PENDING_SYNC_COPY,
    });
  };

  const executeOp = async (userId: string, op: OutboxOp) => {
    const account = getConfiguredAppwriteAccount();
    const state = get();
    switch (op.kind) {
      case 'upsertLog': {
        const existing = state.dailyLogs[op.log.date];
        if (existing && !isNewerIso(op.log.updatedAt, existing.updatedAt)) {
          return;
        }
        await saveDailyLogAndEpisodes(
          account,
          userId,
          op.log,
          op.episodes,
          state.periodEpisodes,
        );
        return;
      }
      case 'deleteLog':
        await deleteDailyLogAndSyncEpisodes(
          account,
          userId,
          op.date,
          op.episodes,
          state.periodEpisodes,
        );
        return;
      case 'manualPeriod':
        await saveManualPeriod(
          account,
          userId,
          op.episodes,
          state.periodEpisodes,
        );
        return;
      case 'profile':
        await saveProfile(account, userId, op.profile);
        return;
      case 'preferences':
        await savePreferences(
          account,
          userId,
          op.appearance,
          op.notifications,
          op.favouriteSymptoms,
        );
        return;
      case 'preparation':
        await savePreparationItem(account, userId, op.item);
        return;
    }
  };

  const flushPending = async () => {
    const userId = get().cloudUserId;
    if (!userId || !get().hydrated) return;
    if (!(await isConnectionAvailable())) {
      const pending = await loadOutbox(userId);
      if (pending.length) markPending();
      return;
    }
    const pending = await loadOutbox(userId);
    if (!pending.length) return;
    set({ syncStatus: 'saving', syncError: undefined });
    try {
      await flushOutbox(userId, (op) => executeOp(userId, op));
      await persistSlice(userId);
      set({ syncStatus: 'saved', syncError: undefined });
    } catch (error) {
      if (isOfflineFailure(error)) {
        markPending();
        return;
      }
      set({
        syncStatus: 'error',
        syncError:
          error instanceof Error
            ? error.message
            : 'Not saved — please try again.',
      });
    }
  };

  /**
   * Cloud write when online; signed-in outbox when the network is gone.
   * Onboarding still requires a live connection — there is no account
   * snapshot to queue against until hydrate has succeeded once.
   */
  const mutate = async <T>(options: {
    apply: () => void;
    op: OutboxOpInput;
    work: (userId: string) => Promise<T>;
    afterOnline?: (result: T) => void;
  }): Promise<boolean> => {
    const userId = get().cloudUserId;
    if (!userId) {
      set({
        syncStatus: 'error',
        syncError: 'Sign in is required before saving cycle data.',
      });
      return false;
    }
    if (!get().hydrated) {
      set({
        syncStatus: 'error',
        syncError: 'Not saved — internet required',
      });
      return false;
    }

    const queueLocal = async () => {
      options.apply();
      await enqueueOutbox(userId, options.op);
      await persistSlice(userId);
      markPending();
      return true;
    };

    if (!(await isConnectionAvailable())) {
      return queueLocal();
    }

    set({ syncStatus: 'saving', syncError: undefined });
    try {
      const result = await options.work(userId);
      options.afterOnline?.(result);
      await persistSlice(userId);
      set({ syncStatus: 'saved', syncError: undefined });
      await flushPending();
      return true;
    } catch (error) {
      if (isOfflineFailure(error)) {
        return queueLocal();
      }
      set({
        syncStatus: 'error',
        syncError:
          error instanceof Error
            ? error.message
            : 'Not saved — please try again.',
      });
      return false;
    }
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
        await persistSlice(userId);
        await flushPending();
      } catch (error) {
        if (isOfflineFailure(error)) {
          const cached = await loadAccountCache(userId);
          if (cached) {
            applyAccount(userId, cached);
            const pending = await loadOutbox(userId);
            set({
              syncStatus: 'offline',
              syncError: pending.length
                ? PENDING_SYNC_COPY
                : 'Showing the last copy saved on this device. Connect to refresh.',
            });
            return;
          }
        }
        set({
          hydrated: false,
          syncStatus: isOfflineFailure(error) ? 'offline' : 'error',
          syncError: isOfflineFailure(error)
            ? 'Not loaded — internet required'
            : error instanceof Error
              ? error.message
              : 'Could not load your account data.',
        });
        throw error;
      }
    },

    resetCloudState: () => {
      const userId = get().cloudUserId;
      if (userId) void wipeSignedInLocal(userId);
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
      });
    },
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

      const { episodes, logs } = createInitialCycleHistory(
        draft.lastPeriodStartDate,
      );

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
      await persistSlice(get().cloudUserId!);
      return true;
    },

    updateProfile: async (patch) => {
      const next = {
        ...get().profile,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return mutate({
        apply: () => set({ profile: next }),
        op: { kind: 'profile', profile: next },
        work: async (userId) =>
          saveProfile(getConfiguredAppwriteAccount(), userId, next),
        afterOnline: (saved) => set({ profile: saved }),
      });
    },

    updateAppearance: async (patch) => {
      const next = { ...get().appearance, ...patch };
      return mutate({
        apply: () => set({ appearance: next }),
        op: {
          kind: 'preferences',
          appearance: next,
          notifications: get().notifications,
          favouriteSymptoms: get().favouriteSymptoms,
        },
        work: async (userId) =>
          savePreferences(
            getConfiguredAppwriteAccount(),
            userId,
            next,
            get().notifications,
            get().favouriteSymptoms,
          ),
        afterOnline: (saved) =>
          set({
            appearance: saved.appearance,
            notifications: saved.notifications,
            favouriteSymptoms: saved.favouriteSymptoms,
          }),
      });
    },

    updateNotifications: async (patch) => {
      const next = { ...get().notifications, ...patch };
      return mutate({
        apply: () => set({ notifications: next }),
        op: {
          kind: 'preferences',
          appearance: get().appearance,
          notifications: next,
          favouriteSymptoms: get().favouriteSymptoms,
        },
        work: async (userId) =>
          savePreferences(
            getConfiguredAppwriteAccount(),
            userId,
            get().appearance,
            next,
            get().favouriteSymptoms,
          ),
        afterOnline: (saved) =>
          set({
            appearance: saved.appearance,
            notifications: saved.notifications,
            favouriteSymptoms: saved.favouriteSymptoms,
          }),
      });
    },

    setPreparationItem: async (id, checked) => {
      const current = get().preparationItems.find((item) => item.id === id);
      if (!current) return false;
      const item = { ...current, checked };
      return mutate({
        apply: () =>
          set({
            preparationItems: get().preparationItems.map((entry) =>
              entry.id === item.id ? item : entry,
            ),
          }),
        op: { kind: 'preparation', item },
        work: async (userId) =>
          savePreparationItem(getConfiguredAppwriteAccount(), userId, item),
        afterOnline: (saved) =>
          set({
            preparationItems: get().preparationItems.map((entry) =>
              entry.id === saved.id ? saved : entry,
            ),
          }),
      });
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
      return mutate({
        apply: () => set({ dailyLogs, periodEpisodes: episodes }),
        op: { kind: 'upsertLog', log, episodes },
        work: async (userId) =>
          saveDailyLogAndEpisodes(
            getConfiguredAppwriteAccount(),
            userId,
            log,
            episodes,
            get().periodEpisodes,
          ),
        afterOnline: (saved) =>
          set({
            dailyLogs: { ...get().dailyLogs, [saved.log.date]: saved.log },
            periodEpisodes: saved.episodes,
          }),
      });
    },

    deleteDailyLog: async (date) => {
      const dailyLogs = { ...get().dailyLogs };
      delete dailyLogs[date];
      const episodes = inferPeriodEpisodes(get().periodEpisodes, dailyLogs);
      return mutate({
        apply: () => set({ dailyLogs, periodEpisodes: episodes }),
        op: { kind: 'deleteLog', date, episodes },
        work: async (userId) =>
          deleteDailyLogAndSyncEpisodes(
            getConfiguredAppwriteAccount(),
            userId,
            date,
            episodes,
            get().periodEpisodes,
          ),
        afterOnline: (saved) => set({ dailyLogs, periodEpisodes: saved }),
      });
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
      return mutate({
        apply: () => set({ periodEpisodes: episodes }),
        op: { kind: 'manualPeriod', episodes },
        work: async (userId) =>
          saveManualPeriod(
            getConfiguredAppwriteAccount(),
            userId,
            episodes,
            previous,
          ),
        afterOnline: (saved) => set({ periodEpisodes: saved }),
      });
    },

    setFavouriteSymptoms: async (codes) => {
      return mutate({
        apply: () => set({ favouriteSymptoms: codes }),
        op: {
          kind: 'preferences',
          appearance: get().appearance,
          notifications: get().notifications,
          favouriteSymptoms: codes,
        },
        work: async (userId) =>
          savePreferences(
            getConfiguredAppwriteAccount(),
            userId,
            get().appearance,
            get().notifications,
            codes,
          ),
        afterOnline: (saved) =>
          set({
            appearance: saved.appearance,
            notifications: saved.notifications,
            favouriteSymptoms: saved.favouriteSymptoms,
          }),
      });
    },

    flushPending,

    signOutAccount: async () => {
      const userId = get().cloudUserId;
      try {
        await flushPending();
      } catch {
        // Best-effort: sign-out still wipes the local copy for this user.
      }
      try {
        await getConfiguredAppwriteAccount().deleteSession({
          sessionId: 'current',
        });
      } catch (error) {
        set({
          syncStatus: 'error',
          syncError:
            error instanceof Error ? error.message : 'Could not sign out.',
        });
        return false;
      }
      if (userId) await wipeSignedInLocal(userId);
      get().resetCloudState();
      return true;
    },

    deleteAccount: async () => {
      const userId = get().cloudUserId;
      const deleted = await remote(async () => {
        const account = getConfiguredAppwriteAccount();
        await deleteAccountRemotely(account);
        return true;
      });
      if (!deleted) return false;
      if (userId) await wipeSignedInLocal(userId);
      get().resetCloudState();
      return true;
    },
  };
});

// Kept as a named export to make the one-time legacy boundary explicit. The
// account-first store never reads the old `luma-store-v1` AsyncStorage key.
export { LEGACY_STORE_KEY as legacyStoreKey } from './legacyMigration';
