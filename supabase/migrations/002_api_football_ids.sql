-- ============================================================
-- Migration 002 — API-Football external IDs + confirmed lineups
-- ============================================================

-- Add external API id to matches so we can upsert from API-Football
alter table public.matches
  add column if not exists api_football_id integer unique;

-- Widen stage check to include round_of_32 (WC2026 is 48 teams)
alter table public.matches
  drop constraint if exists matches_stage_check;

alter table public.matches
  add constraint matches_stage_check check (stage in (
    'group','round_of_32','round_of_16','quarter_final','semi_final','third_place','final'
  ));

-- ============================================================
-- CONFIRMED LINEUPS (from API, separate from user predictions)
-- ============================================================
create table if not exists public.confirmed_lineups (
  id              uuid primary key default uuid_generate_v4(),
  match_id        uuid not null references public.matches(id) on delete cascade,
  team_code       char(3) not null,
  team_name       text not null,
  formation       text,
  start_xi        jsonb not null default '[]',
  -- [{ player_id, name, number, pos, grid }]
  substitutes     jsonb not null default '[]',
  coach           text,
  fetched_at      timestamptz not null default now(),
  unique (match_id, team_code)
);

alter table public.confirmed_lineups enable row level security;

create policy "confirmed_lineups_select_all"
  on public.confirmed_lineups for select using (true);

create index confirmed_lineups_match_id_idx
  on public.confirmed_lineups (match_id);
