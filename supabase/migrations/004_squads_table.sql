-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004: squads table
--
-- Stores the official 26-man WC2026 squad per country.
-- Players stored as JSONB array:
--   [{ "id": 123, "name": "Lionel Messi", "position": "Forward", "shirtNumber": 10 }, ...]
--
-- RLS: anyone can read; only the service role can write.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.squads (
  id          uuid primary key default uuid_generate_v4(),
  team_code   char(3) not null unique,   -- TLA e.g. "MEX"
  team_name   text not null,
  team_fd_id  integer not null unique,   -- football-data.org team id
  players     jsonb not null default '[]'::jsonb,
  synced_at   timestamptz not null default now()
);

create index if not exists squads_team_code_idx on public.squads (team_code);

alter table public.squads enable row level security;

create policy "squads_select_all"
  on public.squads for select using (true);

create policy "squads_insert_service_role"
  on public.squads for insert with check (auth.role() = 'service_role');

create policy "squads_update_service_role"
  on public.squads for update using (auth.role() = 'service_role');

create policy "squads_delete_service_role"
  on public.squads for delete using (auth.role() = 'service_role');
