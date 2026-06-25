-- Add livescore internal match ID (needed for lineups/stats/events API calls)
-- This differs from api_football_id (fixture_id/planning ID used for score sync)
alter table public.matches
  add column if not exists livescore_id integer;

create index if not exists matches_livescore_id_idx on public.matches (livescore_id);
