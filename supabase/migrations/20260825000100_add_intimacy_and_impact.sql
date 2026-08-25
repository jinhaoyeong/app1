-- Intimacy context and functional impact on a daily log.
--
-- Both are optional and both are sensitive. A null value always means "not
-- recorded" and never "did not happen", so no query may infer absence of
-- activity from a null row. Row-level security from the initial migration
-- already restricts every daily_logs row to its owning user; these columns
-- inherit that policy and are never exposed in aggregate.

alter table public.daily_logs
  add column if not exists sexual_activity text;

alter table public.daily_logs
  drop constraint if exists daily_logs_sexual_activity_check;
alter table public.daily_logs
  add constraint daily_logs_sexual_activity_check
  check (sexual_activity is null or sexual_activity in (
    'protected',
    'unprotected',
    'other',
    'prefer_not_to_say'
  ));

alter table public.daily_logs
  add column if not exists functional_impact text;

alter table public.daily_logs
  drop constraint if exists daily_logs_functional_impact_check;
alter table public.daily_logs
  add constraint daily_logs_functional_impact_check
  check (functional_impact is null or functional_impact in (
    'none',
    'some',
    'significant'
  ));
