-- ============================================================
-- Migration 006 — match_events column + result-sync cron job
-- ============================================================

-- 1. Add match_events column (stores goals, bookings, substitutions as jsonb)
alter table public.matches
  add column if not exists match_events jsonb not null default '[]'::jsonb;

comment on column public.matches.match_events is
  'Array of match events fetched from football-data.org: goals, bookings, substitutions.
   Each element: { type: "GOAL"|"BOOKING"|"SUBSTITUTION", minute, team_code, ... }';

-- 2. Enable required extensions (safe – idempotent)
create extension if not exists pg_net   with schema extensions;
create extension if not exists pg_cron  with schema cron;

-- 3. Remove any previous version of this job before (re-)creating it
select cron.unschedule('sync-match-results')
  where exists (
    select 1 from cron.job where jobname = 'sync-match-results'
  );

-- 4. Schedule the Edge Function every 5 minutes.
--    Replace <PROJECT_REF> with your Supabase project reference (found in
--    Project Settings → General → Reference ID).
--    The SUPABASE_SERVICE_ROLE_KEY secret is set automatically by Supabase
--    and available to pg_net as well.
--
--    If you have not yet set the FOOTBALL_API_KEY secret on the Edge Function,
--    run: supabase secrets set FOOTBALL_API_KEY=<your_key>
select cron.schedule(
  'sync-match-results',         -- job name
  '*/5 * * * *',                -- every 5 minutes
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-match-results',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- TIP: after applying this migration, store your service role key in a Postgres
-- setting so the cron job can pass it as a bearer token:
--
--   alter database postgres set app.service_role_key = '<SERVICE_ROLE_KEY>';
--
-- Or use the Supabase dashboard (Project Settings → Edge Functions) to schedule
-- the function directly — no pg_net header wiring required.
