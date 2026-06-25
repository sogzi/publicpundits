-- ============================================================
-- Migration 009: Leagues — invite code function + 6-char trim
-- Tables & RLS already exist from 001_initial_schema.sql
-- owner_id is the creator column (not created_by)
-- ============================================================

-- ─── 1. Proper generate_invite_code() function ───────────────────────────────
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars  text    := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text    := '';
  i      integer;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * 36 + 1)::integer, 1);
  end loop;
  return result;
end;
$$;

-- ─── 2. Trigger: ensure uniqueness & exactly 6 chars on insert ───────────────
create or replace function public.ensure_unique_invite_code()
returns trigger
language plpgsql
as $$
begin
  -- Always generate a fresh code on insert (overrides the md5 default)
  new.invite_code := public.generate_invite_code();
  -- Retry until unique
  while exists (
    select 1 from public.leagues
    where invite_code = new.invite_code and id <> new.id
  ) loop
    new.invite_code := public.generate_invite_code();
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_ensure_unique_invite_code on public.leagues;
create trigger trg_ensure_unique_invite_code
  before insert on public.leagues
  for each row execute function public.ensure_unique_invite_code();
