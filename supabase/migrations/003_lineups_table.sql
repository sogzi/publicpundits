-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: lineups table
--
-- Stores confirmed match lineups (one row per team per match).
-- Players are stored as a JSONB array:
--   [{ "name": "Lionel Messi", "number": 10, "position": "FWD" }, ...]
--
-- RLS: anyone can read; only the service role can insert/update/delete.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.lineups (
  id          uuid primary key default uuid_generate_v4(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  team        text not null,                     -- e.g. "MEX" (3-letter code)
  formation   text,                              -- e.g. "4-3-3"
  players     jsonb not null default '[]'::jsonb, -- array of { name, number, position }
  confirmed   boolean not null default false,    -- true once official lineup is released
  created_at  timestamptz not null default now(),

  unique (match_id, team)
);

-- Index for fast look-ups by match
create index if not exists lineups_match_id_idx on public.lineups (match_id);

-- Enable RLS
alter table public.lineups enable row level security;

-- Anyone (including anonymous) can read lineups
create policy "lineups_select_all"
  on public.lineups
  for select
  using (true);

-- Only the service role can insert (sync route uses admin client)
create policy "lineups_insert_service_role"
  on public.lineups
  for insert
  with check (auth.role() = 'service_role');

-- Only the service role can update
create policy "lineups_update_service_role"
  on public.lineups
  for update
  using (auth.role() = 'service_role');

-- Only the service role can delete
create policy "lineups_delete_service_role"
  on public.lineups
  for delete
  using (auth.role() = 'service_role');
