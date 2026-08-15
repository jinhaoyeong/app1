import type { AppwriteAccount } from '@/auth/appwrite';
import type {
  AppearancePrefs,
  DailyLog,
  NotificationPrefs,
  PeriodEpisode,
  PreparationItem,
  Profile,
} from '@/types';
import type { HydratedCloudAccount } from './types';

/**
 * Appwrite account preferences are private to the signed-in account. They
 * give the app a working cloud-first store while the project is being
 * migrated, without putting health data in a public collection. Appwrite
 * limits preferences to 64 kB; the guard below turns that limit into a clear
 * save error instead of silently losing a user's data.
 */
const STATE_KEY = 'lumaState';
const MAX_PREFERENCES_BYTES = 64 * 1024;

type AppwritePreferences = {
  [STATE_KEY]?: string;
};

export class CloudSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudSyncError';
  }
}

const emptyAccount = (): HydratedCloudAccount => ({
  profile: null,
  periodEpisodes: [],
  dailyLogs: {},
  preparationItems: [],
  appearance: null,
  notifications: null,
  favouriteSymptoms: null,
});

function serializedSize(value: string): number {
  // encodeURIComponent overestimates some UTF-8 sequences, which is useful
  // here: a borderline payload should be rejected before Appwrite rejects it.
  return encodeURIComponent(value).length;
}

function parseState(value: unknown): HydratedCloudAccount {
  if (typeof value !== 'string' || !value.trim()) return emptyAccount();
  try {
    const parsed = JSON.parse(value) as Partial<HydratedCloudAccount>;
    return {
      profile: parsed.profile ?? null,
      periodEpisodes: Array.isArray(parsed.periodEpisodes)
        ? parsed.periodEpisodes
        : [],
      dailyLogs:
        parsed.dailyLogs && typeof parsed.dailyLogs === 'object'
          ? parsed.dailyLogs
          : {},
      preparationItems: Array.isArray(parsed.preparationItems)
        ? parsed.preparationItems
        : [],
      appearance: parsed.appearance ?? null,
      notifications: parsed.notifications ?? null,
      favouriteSymptoms: Array.isArray(parsed.favouriteSymptoms)
        ? parsed.favouriteSymptoms
        : null,
    };
  } catch {
    throw new CloudSyncError('Your saved Luma data could not be read.');
  }
}

async function readState(account: AppwriteAccount): Promise<HydratedCloudAccount> {
  try {
    const preferences = await account.getPrefs<AppwritePreferences>();
    return parseState(preferences[STATE_KEY]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CloudSyncError(message);
  }
}

async function writeState(
  account: AppwriteAccount,
  state: HydratedCloudAccount,
): Promise<HydratedCloudAccount> {
  const serialized = JSON.stringify(state);
  if (serializedSize(serialized) > MAX_PREFERENCES_BYTES) {
    throw new CloudSyncError(
      'Your Luma history is larger than Appwrite account storage allows. Export a copy, then contact support before adding more data.',
    );
  }
  try {
    await account.updatePrefs<AppwritePreferences>({
      prefs: { [STATE_KEY]: serialized },
    });
    return state;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CloudSyncError(message);
  }
}

export async function hydrateCloudAccount(
  account: AppwriteAccount,
  _userId: string,
): Promise<HydratedCloudAccount> {
  return readState(account);
}

export async function saveProfile(
  account: AppwriteAccount,
  _userId: string,
  profile: Profile,
): Promise<Profile> {
  const state = await readState(account);
  await writeState(account, { ...state, profile });
  return profile;
}

export async function savePreferences(
  account: AppwriteAccount,
  _userId: string,
  appearance: AppearancePrefs,
  notifications: NotificationPrefs,
  favouriteSymptoms: string[],
): Promise<{
  appearance: AppearancePrefs;
  notifications: NotificationPrefs;
  favouriteSymptoms: string[];
}> {
  const state = await readState(account);
  await writeState(account, {
    ...state,
    appearance,
    notifications,
    favouriteSymptoms,
  });
  return { appearance, notifications, favouriteSymptoms };
}

export async function savePreparationItem(
  account: AppwriteAccount,
  _userId: string,
  item: PreparationItem,
): Promise<PreparationItem> {
  const state = await readState(account);
  const preparationItems = [
    ...state.preparationItems.filter((entry) => entry.id !== item.id),
    item,
  ];
  await writeState(account, { ...state, preparationItems });
  return item;
}

export async function syncPeriodEpisodes(
  account: AppwriteAccount,
  _userId: string,
  episodes: PeriodEpisode[],
  _previousEpisodes: PeriodEpisode[],
): Promise<PeriodEpisode[]> {
  const state = await readState(account);
  await writeState(account, { ...state, periodEpisodes: episodes });
  return episodes;
}

export async function saveDailyLogAndEpisodes(
  account: AppwriteAccount,
  _userId: string,
  log: DailyLog,
  episodes: PeriodEpisode[],
  _previousEpisodes: PeriodEpisode[],
): Promise<{ log: DailyLog; episodes: PeriodEpisode[] }> {
  const state = await readState(account);
  await writeState(account, {
    ...state,
    dailyLogs: { ...state.dailyLogs, [log.date]: log },
    periodEpisodes: episodes,
  });
  return { log, episodes };
}

export async function deleteDailyLogAndSyncEpisodes(
  account: AppwriteAccount,
  _userId: string,
  date: string,
  episodes: PeriodEpisode[],
  _previousEpisodes: PeriodEpisode[],
): Promise<PeriodEpisode[]> {
  const state = await readState(account);
  const dailyLogs = { ...state.dailyLogs };
  delete dailyLogs[date];
  await writeState(account, { ...state, dailyLogs, periodEpisodes: episodes });
  return episodes;
}

export async function saveManualPeriod(
  account: AppwriteAccount,
  _userId: string,
  episodes: PeriodEpisode[],
  _previousEpisodes: PeriodEpisode[],
): Promise<PeriodEpisode[]> {
  const state = await readState(account);
  await writeState(account, { ...state, periodEpisodes: episodes });
  return episodes;
}

export const DEFAULT_PREPARATION: PreparationItem[] = [
  { id: 'products', label: 'Bring period products', checked: false },
  { id: 'pain_relief', label: 'Refill pain relief', checked: false },
  { id: 'underwear', label: 'Pack spare underwear', checked: false },
  { id: 'heat', label: 'Restock heat patches', checked: false },
  { id: 'personal', label: 'Personal reminder', checked: false },
];

export async function saveOnboarding(
  account: AppwriteAccount,
  _userId: string,
  profile: Profile,
  episodes: PeriodEpisode[],
  logs: Record<string, DailyLog>,
  appearance: AppearancePrefs,
  notifications: NotificationPrefs,
  favouriteSymptoms: string[],
): Promise<HydratedCloudAccount> {
  const state: HydratedCloudAccount = {
    profile,
    periodEpisodes: episodes,
    dailyLogs: logs,
    preparationItems: DEFAULT_PREPARATION.map((item) => ({ ...item })),
    appearance,
    notifications,
    favouriteSymptoms,
  };
  await writeState(account, state);
  return state;
}

/**
 * Appwrite's client SDK intentionally cannot delete a user record. Account
 * deletion needs a server-side Users API or Function, so never pretend a
 * local session deletion removed the account's health data.
 */
export async function deleteAccountRemotely(_account: AppwriteAccount): Promise<void> {
  throw new CloudSyncError(
    'Account deletion is not enabled in this Appwrite project yet. Your data remains protected; contact support to remove the account.',
  );
}
