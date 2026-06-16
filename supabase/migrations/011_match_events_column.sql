-- Migration 011 — ensure match_events column exists on matches table
-- (Migration 006 included this but may not have been applied to production)

alter table public.matches
  add column if not exists match_events jsonb not null default '[]'::jsonb;
