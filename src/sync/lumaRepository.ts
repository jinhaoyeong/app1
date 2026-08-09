import type { SupabaseClient } from '@supabase/supabase-js';
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
  HydratedCloudAccount,
} from './types';
import {
  dailyLogFromCloudRow,
  dailyLogToCloudRow,
  episodeFromCloudRow,
  episodeToCloudRow,
  preferencesFromCloudRow,
  preferencesToCloudRow,
  preparationFromCloudRow,
  preparationToCloudRow,
  profileFromCloudRow,
  profileToCloudRow,
} from './rowMappers';

export class CloudSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudSyncError';
  }
}

async function requireResult<T>(
  request: PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T> {
  const { data, error } = await request;
  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CloudSyncError(message);
  }
  if (data === null) throw new CloudSyncError('Cloud response was empty.');
  return data;
}

async function requireMaybeResult<T>(
  request: PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T | null> {
  const { data, error } = await request;
  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CloudSyncError(message);
  }
  return data;
}

async function requireNoError(
  request: PromiseLike<{ error: { message: string } | null }>,
): Promise<void> {
  const { error } = await request;
  if (error) throw new CloudSyncError(error.message);
}

export async function hydrateCloudAccount(
  client: SupabaseClient,
  userId: string,
): Promise<HydratedCloudAccount> {
  const [profile, episodes, logs, preparation, preferences] = await Promise.all(
    [
      requireMaybeResult<CloudProfileRow>(
        client.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      ),
      requireResult<CloudPeriodEpisodeRow[]>(
        client
          .from('period_episodes')
          .select('*')
          .eq('user_id', userId)
          .order('start_date', { ascending: true }),
      ),
      requireResult<CloudDailyLogRow[]>(
        client
          .from('daily_logs')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: true }),
      ),
      requireResult<CloudPreparationItemRow[]>(
        client
          .from('preparation_items')
          .select('*')
          .eq('user_id', userId)
          .order('id', { ascending: true }),
      ),
      requireMaybeResult<CloudPreferencesRow>(
        client
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
      ),
    ],
  );

  const mappedPreferences = preferences
    ? preferencesFromCloudRow(preferences)
    : null;
  return {
    profile: profile ? profileFromCloudRow(profile) : null,
    periodEpisodes: episodes.map(episodeFromCloudRow),
    dailyLogs: Object.fromEntries(
      logs.map((row) => {
        const log = dailyLogFromCloudRow(row);
        return [log.date, log];
      }),
    ),
    preparationItems: preparation.map(preparationFromCloudRow),
    appearance: mappedPreferences?.appearance ?? null,
    notifications: mappedPreferences?.notifications ?? null,
    favouriteSymptoms: mappedPreferences?.favouriteSymptoms ?? null,
  };
}

export async function saveProfile(
  client: SupabaseClient,
  userId: string,
  profile: Profile,
): Promise<Profile> {
  const row = await requireResult<CloudProfileRow>(
    client
      .from('profiles')
      .upsert(profileToCloudRow(userId, profile), { onConflict: 'user_id' })
      .select('*')
      .single(),
  );
  return profileFromCloudRow(row);
}

export async function savePreferences(
  client: SupabaseClient,
  userId: string,
  appearance: AppearancePrefs,
  notifications: NotificationPrefs,
  favouriteSymptoms: string[],
): Promise<{
  appearance: AppearancePrefs;
  notifications: NotificationPrefs;
  favouriteSymptoms: string[];
}> {
  const row = await requireResult<CloudPreferencesRow>(
    client
      .from('user_preferences')
      .upsert(
        preferencesToCloudRow(
          userId,
          appearance,
          notifications,
          favouriteSymptoms,
        ),
        { onConflict: 'user_id' },
      )
      .select('*')
      .single(),
  );
  return preferencesFromCloudRow(row);
}

export async function savePreparationItem(
  client: SupabaseClient,
  userId: string,
  item: PreparationItem,
): Promise<PreparationItem> {
  const row = await requireResult<CloudPreparationItemRow>(
    client
      .from('preparation_items')
      .upsert(preparationToCloudRow(userId, item), {
        onConflict: 'user_id,id',
      })
      .select('*')
      .single(),
  );
  return preparationFromCloudRow(row);
}

export async function syncPeriodEpisodes(
  client: SupabaseClient,
  userId: string,
  episodes: PeriodEpisode[],
  previousEpisodes: PeriodEpisode[],
): Promise<PeriodEpisode[]> {
  if (episodes.length) {
    const rows = episodes.map((episode) => episodeToCloudRow(userId, episode));
    await requireNoError(
      client.from('period_episodes').upsert(rows, { onConflict: 'id' }),
    );
  }

  const nextIds = new Set(episodes.map((episode) => episode.id));
  const staleIds = previousEpisodes
    .filter((episode) => !nextIds.has(episode.id))
    .map((episode) => episode.id);
  if (staleIds.length) {
    await requireNoError(
      client
        .from('period_episodes')
        .delete()
        .eq('user_id', userId)
        .in('id', staleIds),
    );
  }
  return episodes;
}

export async function saveDailyLogAndEpisodes(
  client: SupabaseClient,
  userId: string,
  log: DailyLog,
  episodes: PeriodEpisode[],
  previousEpisodes: PeriodEpisode[],
): Promise<{ log: DailyLog; episodes: PeriodEpisode[] }> {
  const savedRow = await requireResult<CloudDailyLogRow>(
    client
      .from('daily_logs')
      .upsert(dailyLogToCloudRow(userId, log), {
        onConflict: 'user_id,date',
      })
      .select('*')
      .single(),
  );
  await syncPeriodEpisodes(client, userId, episodes, previousEpisodes);
  return { log: dailyLogFromCloudRow(savedRow), episodes };
}

export async function deleteDailyLogAndSyncEpisodes(
  client: SupabaseClient,
  userId: string,
  date: string,
  episodes: PeriodEpisode[],
  previousEpisodes: PeriodEpisode[],
): Promise<PeriodEpisode[]> {
  await requireNoError(
    client.from('daily_logs').delete().eq('user_id', userId).eq('date', date),
  );
  return syncPeriodEpisodes(client, userId, episodes, previousEpisodes);
}

export async function saveManualPeriod(
  client: SupabaseClient,
  userId: string,
  episodes: PeriodEpisode[],
  previousEpisodes: PeriodEpisode[],
): Promise<PeriodEpisode[]> {
  return syncPeriodEpisodes(client, userId, episodes, previousEpisodes);
}

const DEFAULT_PREPARATION: PreparationItem[] = [
  { id: 'products', label: 'Bring period products', checked: false },
  { id: 'pain_relief', label: 'Refill pain relief', checked: false },
  { id: 'underwear', label: 'Pack spare underwear', checked: false },
  { id: 'heat', label: 'Restock heat patches', checked: false },
  { id: 'personal', label: 'Personal reminder', checked: false },
];

export async function saveOnboarding(
  client: SupabaseClient,
  userId: string,
  profile: Profile,
  episodes: PeriodEpisode[],
  logs: Record<string, DailyLog>,
  appearance: AppearancePrefs,
  notifications: NotificationPrefs,
  favouriteSymptoms: string[],
): Promise<HydratedCloudAccount> {
  await saveProfile(client, userId, profile);
  if (episodes.length) {
    await syncPeriodEpisodes(client, userId, episodes, []);
  }
  const logRows = Object.values(logs);
  if (logRows.length) {
    await requireNoError(
      client.from('daily_logs').upsert(
        logRows.map((log) => dailyLogToCloudRow(userId, log)),
        {
          onConflict: 'user_id,date',
        },
      ),
    );
  }
  await requireNoError(
    client.from('preparation_items').upsert(
      DEFAULT_PREPARATION.map((item) => preparationToCloudRow(userId, item)),
      { onConflict: 'user_id,id' },
    ),
  );
  await savePreferences(
    client,
    userId,
    appearance,
    notifications,
    favouriteSymptoms,
  );
  return hydrateCloudAccount(client, userId);
}

export async function deleteAccountRemotely(
  client: SupabaseClient,
): Promise<void> {
  const { data, error } = await client.functions.invoke<{ deleted?: boolean }>(
    'delete-account',
    {
      body: {},
    },
  );
  if (error) throw new CloudSyncError(error.message);
  if (!data?.deleted) {
    throw new CloudSyncError('Account deletion was not confirmed by Supabase.');
  }
}

export { DEFAULT_PREPARATION };
