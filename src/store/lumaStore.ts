import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createId } from '@/utils/id';
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
  TrackingGoal,
} from '@/types';
import { inferPeriodEpisodes } from '@/engine/cycle';
import { toLocalDateString } from '@/utils/dates';

const defaultProfile = (): Profile => ({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  locale: 'en',
  onboardingComplete: false,
  trackingGoals: [],
  fertilityEnabled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const defaultAppearance = (): AppearancePrefs => ({
  colorMode: 'system',
  accent: 'sage',
  discreetMode: false,
  biometricLock: false,
  biometricTimeout: '1m',
});

const defaultNotifications = (): NotificationPrefs => ({
  periodPrediction: true,
  periodPreparation: true,
  dailyLog: false,
  patternDiscovered: true,
  importantChange: true,
  showDetailedText: false,
});

const defaultPreparation = (): PreparationItem[] => [
  { id: 'products', label: 'Bring period products', checked: false },
  { id: 'pain_relief', label: 'Refill pain relief', checked: false },
  { id: 'underwear', label: 'Pack spare underwear', checked: false },
  { id: 'heat', label: 'Restock heat patches', checked: false },
  { id: 'personal', label: 'Personal reminder', checked: false },
];

interface LumaStore {
  profile: Profile;
  appearance: AppearancePrefs;
  notifications: NotificationPrefs;
  preparationItems: PreparationItem[];
  periodEpisodes: PeriodEpisode[];
  dailyLogs: Record<string, DailyLog>;
  favouriteSymptoms: string[];
  onboardingDraft: {
    trackingGoals: TrackingGoal[];
    lastPeriodStartDate?: string;
    usualPeriodLength?: number;
    cycleRegularity?: CycleRegularity;
    contraceptionType?: ContraceptionType;
  };
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  patchOnboardingDraft: (
    patch: Partial<LumaStore['onboardingDraft']>,
  ) => void;
  completeOnboarding: (input?: {
    trackingGoals?: TrackingGoal[];
    lastPeriodStartDate?: string;
    usualPeriodLength?: number;
    cycleRegularity?: CycleRegularity;
    contraceptionType?: ContraceptionType;
    displayName?: string;
  }) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updateAppearance: (patch: Partial<AppearancePrefs>) => void;
  updateNotifications: (patch: Partial<NotificationPrefs>) => void;
  setPreparationItem: (id: string, checked: boolean) => void;
  upsertDailyLog: (
    date: string,
    patch: Partial<
      Omit<DailyLog, 'id' | 'date' | 'updatedAt'>
    > & {
      flow?: FlowLevel;
      mood?: MoodLevel;
      energy?: EnergyLevel;
      pain?: PainLevel;
      painLocations?: PainLocation[];
    },
  ) => void;
  deleteDailyLog: (date: string) => void;
  addManualPeriod: (startDate: string, endDate?: string) => void;
  setFavouriteSymptoms: (codes: string[]) => void;
  deleteAllData: () => void;
  loadDemoData: () => void;
}

export const useLumaStore = create<LumaStore>()(
  persist(
    (set, get) => ({
      profile: defaultProfile(),
      appearance: defaultAppearance(),
      notifications: defaultNotifications(),
      preparationItems: defaultPreparation(),
      periodEpisodes: [],
      dailyLogs: {},
      favouriteSymptoms: [
        'cramps',
        'headache',
        'bloating',
        'cravings',
        'irritability',
        'poor_sleep',
      ],
      onboardingDraft: {
        trackingGoals: [],
      },
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      patchOnboardingDraft: (patch) =>
        set({
          onboardingDraft: { ...get().onboardingDraft, ...patch },
        }),
      completeOnboarding: (input = {}) => {
        const draft = { ...get().onboardingDraft, ...input };
        const trackingGoals = draft.trackingGoals ?? [];
        const fertilityEnabled = trackingGoals.includes('trying_to_conceive');
        const profile: Profile = {
          ...get().profile,
          trackingGoals,
          lastPeriodStartDate: draft.lastPeriodStartDate,
          usualPeriodLength: draft.usualPeriodLength,
          cycleRegularity: draft.cycleRegularity,
          contraceptionType: draft.contraceptionType,
          displayName: input.displayName ?? get().profile.displayName,
          fertilityEnabled,
          onboardingComplete: true,
          updatedAt: new Date().toISOString(),
        };

        let episodes = [...get().periodEpisodes];
        let logs = { ...get().dailyLogs };

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
          // Seed light flow for assumed period days if still recent
          for (let i = 0; i < Math.min(length, 5); i++) {
            const d = addDaysSafe(start, i);
            if (d > toLocalDateString()) break;
            logs[d] = {
              id: createId(),
              date: d,
              flow: i === 1 ? 'heavy' : i === 0 ? 'medium' : 'light',
              updatedAt: new Date().toISOString(),
            };
          }
          episodes = inferPeriodEpisodes(episodes, logs);
        }

        set({ profile, periodEpisodes: episodes, dailyLogs: logs });
      },
      updateProfile: (patch) =>
        set({
          profile: {
            ...get().profile,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        }),
      updateAppearance: (patch) =>
        set({ appearance: { ...get().appearance, ...patch } }),
      updateNotifications: (patch) =>
        set({ notifications: { ...get().notifications, ...patch } }),
      setPreparationItem: (id, checked) =>
        set({
          preparationItems: get().preparationItems.map((i) =>
            i.id === id ? { ...i, checked } : i,
          ),
        }),
      upsertDailyLog: (date, patch) => {
        const existing = get().dailyLogs[date];
        const log: DailyLog = {
          ...existing,
          ...patch,
          id: existing?.id ?? createId(),
          date,
          updatedAt: new Date().toISOString(),
        };
        const dailyLogs = { ...get().dailyLogs, [date]: log };
        const periodEpisodes = inferPeriodEpisodes(
          get().periodEpisodes,
          dailyLogs,
        );
        set({ dailyLogs, periodEpisodes });
      },
      deleteDailyLog: (date) => {
        const dailyLogs = { ...get().dailyLogs };
        delete dailyLogs[date];
        const periodEpisodes = inferPeriodEpisodes(
          get().periodEpisodes,
          dailyLogs,
        );
        set({ dailyLogs, periodEpisodes });
      },
      addManualPeriod: (startDate, endDate) => {
        const episodes = [
          ...get().periodEpisodes.filter((e) => e.startDate !== startDate),
          {
            id: createId(),
            startDate,
            endDate,
            source: 'manual' as const,
            manuallyConfirmed: true,
          },
        ];
        set({ periodEpisodes: episodes });
      },
      setFavouriteSymptoms: (codes) => set({ favouriteSymptoms: codes }),
      deleteAllData: () =>
        set({
          profile: defaultProfile(),
          appearance: defaultAppearance(),
          notifications: defaultNotifications(),
          preparationItems: defaultPreparation(),
          periodEpisodes: [],
          dailyLogs: {},
          favouriteSymptoms: [
            'cramps',
            'headache',
            'bloating',
            'cravings',
            'irritability',
            'poor_sleep',
          ],
          onboardingDraft: { trackingGoals: [] },
        }),
      loadDemoData: () => {
        const demo = buildDemoDataset();
        set({
          profile: {
            ...defaultProfile(),
            displayName: 'Mia',
            onboardingComplete: true,
            trackingGoals: [
              'understand_symptoms',
              'predict_period',
              'prepare_period',
            ],
            lastPeriodStartDate: demo.episodes[demo.episodes.length - 1]
              ?.startDate,
            usualPeriodLength: 5,
            cycleRegularity: 'usually',
            contraceptionType: 'none',
            fertilityEnabled: false,
            updatedAt: new Date().toISOString(),
          },
          periodEpisodes: demo.episodes,
          dailyLogs: demo.logs,
        });
      },
    }),
    {
      name: 'luma-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (s) => ({
        profile: s.profile,
        appearance: s.appearance,
        notifications: s.notifications,
        preparationItems: s.preparationItems,
        periodEpisodes: s.periodEpisodes,
        dailyLogs: s.dailyLogs,
        favouriteSymptoms: s.favouriteSymptoms,
      }),
    },
  ),
);

function addDaysSafe(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Synthetic multi-cycle history for demos and mature Today/Insights states. */
function buildDemoDataset(): {
  episodes: PeriodEpisode[];
  logs: Record<string, DailyLog>;
} {
  const today = toLocalDateString();
  const cycleStarts = [0, 30, 59, 89, 119, 149].map((daysAgo) =>
    addDaysSafe(today, -daysAgo),
  ).reverse();

  // Adjust so last period started ~25 days ago → cycle day ~26
  const adjusted = [
    addDaysSafe(today, -175),
    addDaysSafe(today, -145),
    addDaysSafe(today, -115),
    addDaysSafe(today, -85),
    addDaysSafe(today, -55),
    addDaysSafe(today, -25),
  ];

  const episodes: PeriodEpisode[] = adjusted.map((start) => ({
    id: createId(),
    startDate: start,
    endDate: addDaysSafe(start, 4),
    source: 'manual' as const,
    manuallyConfirmed: true,
  }));

  const logs: Record<string, DailyLog> = {};

  for (const start of adjusted) {
    for (let i = 0; i < 5; i++) {
      const d = addDaysSafe(start, i);
      logs[d] = {
        id: createId(),
        date: d,
        flow: i === 0 ? 'medium' : i === 1 ? 'heavy' : i < 4 ? 'light' : 'spotting',
        mood: i < 2 ? 'okay' : 'good',
        energy: i < 2 ? 'low' : 'normal',
        pain: i < 2 ? 'moderate' : 'mild',
        painLocations: ['cramps'],
        symptoms: i < 2 ? ['cramps', 'backache'] : ['cramps'],
        updatedAt: new Date().toISOString(),
      };
    }
    // Pre-period pattern: bloating, low energy, headache
    for (const offset of [-4, -3, -2]) {
      const d = addDaysSafe(start, offset);
      if (logs[d]) continue;
      logs[d] = {
        id: createId(),
        date: d,
        mood: 'low',
        energy: 'low',
        pain: 'mild',
        symptoms: ['bloating', 'cravings', 'headache', 'irritability'],
        updatedAt: new Date().toISOString(),
      };
    }
  }

  // Today log partial
  if (!logs[today]) {
    logs[today] = {
      id: createId(),
      date: today,
      mood: 'okay',
      energy: 'low',
      pain: 'none',
      symptoms: ['bloating'],
      updatedAt: new Date().toISOString(),
    };
  }

  return { episodes, logs };
}
