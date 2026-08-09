create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  locale text not null default 'en',
  onboarding_complete boolean not null default false,
  tracking_goals jsonb not null default '[]'::jsonb,
  last_period_start_date date,
  usual_period_length integer check (usual_period_length between 2 and 10),
  cycle_regularity text check (cycle_regularity in ('usually', 'sometimes', 'rarely', 'unsure')),
  contraception_type text check (contraception_type in (
    'none', 'combined_pill', 'pop', 'hormonal_iud', 'copper_iud', 'implant',
    'injection', 'patch', 'ring', 'other', 'prefer_not'
  )),
  fertility_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_tracking_goals_array check (jsonb_typeof(tracking_goals) = 'array')
);

create table if not exists public.period_episodes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date,
  source text not null check (source in ('manual', 'inferred', 'imported')),
  manually_confirmed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint period_episodes_dates check (end_date is null or end_date >= start_date),
  constraint period_episodes_user_start_unique unique (user_id, start_date)
);

create table if not exists public.daily_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  flow text check (flow in ('none', 'spotting', 'light', 'medium', 'heavy', 'very_heavy')),
  mood text check (mood in ('great', 'good', 'okay', 'low', 'rough')),
  energy text check (energy in ('very_low', 'low', 'normal', 'high', 'very_high')),
  pain text check (pain in ('none', 'mild', 'moderate', 'severe')),
  pain_locations jsonb,
  symptoms jsonb,
  sleep_hours numeric(4, 1) check (sleep_hours between 0 and 24),
  note text,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint daily_logs_user_date_unique unique (user_id, date),
  constraint daily_logs_pain_locations_array check (pain_locations is null or jsonb_typeof(pain_locations) = 'array'),
  constraint daily_logs_symptoms_array check (symptoms is null or jsonb_typeof(symptoms) = 'array')
);

create table if not exists public.preparation_items (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  checked boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, id)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  color_mode text not null default 'system' check (color_mode in ('system', 'light', 'dark')),
  accent text not null default 'dust_rose' check (accent in ('dust_rose', 'lavender', 'sage', 'ocean', 'sand', 'plum')),
  discreet_mode boolean not null default false,
  notification_preferences jsonb not null default '{}'::jsonb,
  favourite_symptoms jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_preferences_notifications_object check (jsonb_typeof(notification_preferences) = 'object'),
  constraint user_preferences_favourite_symptoms_array check (jsonb_typeof(favourite_symptoms) = 'array')
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists period_episodes_set_updated_at on public.period_episodes;
create trigger period_episodes_set_updated_at before update on public.period_episodes
for each row execute function public.set_updated_at();

drop trigger if exists daily_logs_set_updated_at on public.daily_logs;
create trigger daily_logs_set_updated_at before update on public.daily_logs
for each row execute function public.set_updated_at();

drop trigger if exists preparation_items_set_updated_at on public.preparation_items;
create trigger preparation_items_set_updated_at before update on public.preparation_items
for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at before update on public.user_preferences
for each row execute function public.set_updated_at();

create index if not exists period_episodes_user_start_idx
  on public.period_episodes (user_id, start_date);
create index if not exists daily_logs_user_date_idx
  on public.daily_logs (user_id, date);

alter table public.profiles enable row level security;
alter table public.period_episodes enable row level security;
alter table public.daily_logs enable row level security;
alter table public.preparation_items enable row level security;
alter table public.user_preferences enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.period_episodes to authenticated;
grant select, insert, update, delete on public.daily_logs to authenticated;
grant select, insert, update, delete on public.preparation_items to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists period_episodes_select_own on public.period_episodes;
create policy period_episodes_select_own on public.period_episodes
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists period_episodes_insert_own on public.period_episodes;
create policy period_episodes_insert_own on public.period_episodes
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists period_episodes_update_own on public.period_episodes;
create policy period_episodes_update_own on public.period_episodes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists period_episodes_delete_own on public.period_episodes;
create policy period_episodes_delete_own on public.period_episodes
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists daily_logs_select_own on public.daily_logs;
create policy daily_logs_select_own on public.daily_logs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists daily_logs_insert_own on public.daily_logs;
create policy daily_logs_insert_own on public.daily_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists daily_logs_update_own on public.daily_logs;
create policy daily_logs_update_own on public.daily_logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists daily_logs_delete_own on public.daily_logs;
create policy daily_logs_delete_own on public.daily_logs
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists preparation_items_select_own on public.preparation_items;
create policy preparation_items_select_own on public.preparation_items
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists preparation_items_insert_own on public.preparation_items;
create policy preparation_items_insert_own on public.preparation_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists preparation_items_update_own on public.preparation_items;
create policy preparation_items_update_own on public.preparation_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists preparation_items_delete_own on public.preparation_items;
create policy preparation_items_delete_own on public.preparation_items
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists user_preferences_select_own on public.user_preferences;
create policy user_preferences_select_own on public.user_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists user_preferences_insert_own on public.user_preferences;
create policy user_preferences_insert_own on public.user_preferences
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists user_preferences_update_own on public.user_preferences;
create policy user_preferences_update_own on public.user_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists user_preferences_delete_own on public.user_preferences;
create policy user_preferences_delete_own on public.user_preferences
  for delete to authenticated using ((select auth.uid()) = user_id);
