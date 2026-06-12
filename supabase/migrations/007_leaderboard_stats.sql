-- ============================================================
-- Migration 007: Leaderboard stats columns + enriched view
-- ============================================================

-- Add stats columns to score_predictions so we can query them
alter table public.score_predictions
  add column if not exists correct_score   boolean,
  add column if not exists correct_outcome boolean;

-- Add stat aggregate columns to profiles
alter table public.profiles
  add column if not exists correct_scores   integer not null default 0,
  add column if not exists correct_outcomes integer not null default 0;

-- Add stage column to score_predictions for "this round" filtering
-- (populated when points are calculated)
alter table public.score_predictions
  add column if not exists match_stage text;

-- Drop old simple leaderboard view and replace with enriched version
drop view if exists public.leaderboard;

create or replace view public.leaderboard as
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.country_code,
    p.total_points,
    coalesce(p.correct_scores,   0) as correct_scores,
    coalesce(p.correct_outcomes, 0) as correct_outcomes,
    -- Last 5 graded predictions as a jsonb array of objects
    -- { points: 3|1|0, match_id, kickoff_at }
    (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'points',     sp.points_awarded,
          'match_id',   sp.match_id,
          'correct_score',   sp.correct_score,
          'correct_outcome', sp.correct_outcome
        ) order by sp.created_at desc
      ), '[]'::jsonb)
      from (
        select sp2.points_awarded, sp2.match_id, sp2.created_at,
               sp2.correct_score, sp2.correct_outcome
        from public.score_predictions sp2
        where sp2.user_id = p.id
          and sp2.points_awarded is not null
        order by sp2.created_at desc
        limit 5
      ) sp
    ) as recent_form,
    rank() over (order by p.total_points desc) as rank
  from public.profiles p
  order by p.total_points desc;

-- RLS: leaderboard view inherits from underlying tables
-- (profiles is already select-all, score_predictions has finished-match policy)
