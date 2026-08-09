-- Keep fertility estimates conservative when context or bleeding type makes
-- calendar timing unreliable. The JSON array stores typed app context keys;
-- the client still treats unknown or missing values as unavailable.
alter table public.profiles
  add column if not exists safety_contexts jsonb not null default '[]'::jsonb,
  add column if not exists safety_context_reviewed boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_safety_contexts_array;
alter table public.profiles
  add constraint profiles_safety_contexts_array
  check (jsonb_typeof(safety_contexts) = 'array');

alter table public.daily_logs
  add column if not exists bleeding_type text;

alter table public.daily_logs
  drop constraint if exists daily_logs_bleeding_type_check;
alter table public.daily_logs
  add constraint daily_logs_bleeding_type_check
  check (bleeding_type is null or bleeding_type in (
    'natural_period', 'withdrawal', 'breakthrough', 'spotting', 'post_sex', 'unknown'
  ));

