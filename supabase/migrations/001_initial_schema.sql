-- ============================================================
-- PublicPundits — Initial Schema
-- World Cup fan engagement platform
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  avatar_url   text,
  country_code char(2),
  total_points integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all"    on public.profiles for select using (true);
create policy "profiles_insert_own"    on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"    on public.profiles for update using (auth.uid() = id);

-- ============================================================
-- MATCHES
-- ============================================================
create table public.matches (
  id              uuid primary key default uuid_generate_v4(),
  home_team       text not null,
  away_team       text not null,
  home_team_code  char(3) not null,
  away_team_code  char(3) not null,
  home_score      integer,
  away_score      integer,
  kickoff_at      timestamptz not null,
  stage           text not null check (stage in (
    'group','round_of_16','quarter_final','semi_final','third_place','final'
  )),
  group_name      text,
  venue           text,
  status          text not null default 'upcoming' check (status in (
    'upcoming','live','finished'
  )),
  predictions_locked_at timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.matches enable row level security;

create policy "matches_select_all" on public.matches for select using (true);
create policy "matches_insert_admin" on public.matches for insert
  with check (auth.jwt() ->> 'role' = 'service_role');
create policy "matches_update_admin" on public.matches for update
  using (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- SCORE PREDICTIONS
-- ============================================================
create table public.score_predictions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  match_id        uuid not null references public.matches(id) on delete cascade,
  home_score      integer not null check (home_score >= 0),
  away_score      integer not null check (away_score >= 0),
  points_awarded  integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, match_id)
);

alter table public.score_predictions enable row level security;

create policy "score_predictions_select_own"
  on public.score_predictions for select using (auth.uid() = user_id);
create policy "score_predictions_select_others_finished"
  on public.score_predictions for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.status = 'finished'
    )
  );
create policy "score_predictions_insert_own"
  on public.score_predictions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.predictions_locked_at is null or now() < m.predictions_locked_at)
    )
  );
create policy "score_predictions_update_own"
  on public.score_predictions for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.predictions_locked_at is null or now() < m.predictions_locked_at)
    )
  );

-- ============================================================
-- LINEUP PREDICTIONS
-- ============================================================
create table public.lineup_predictions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  match_id    uuid not null references public.matches(id) on delete cascade,
  team_code   char(3) not null,
  players     jsonb not null default '[]',   -- array of { name, position, shirt_number }
  formation   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, match_id, team_code)
);

alter table public.lineup_predictions enable row level security;

create policy "lineup_predictions_select_own"
  on public.lineup_predictions for select using (auth.uid() = user_id);
create policy "lineup_predictions_insert_own"
  on public.lineup_predictions for insert with check (auth.uid() = user_id);
create policy "lineup_predictions_update_own"
  on public.lineup_predictions for update using (auth.uid() = user_id);

-- ============================================================
-- PLAYER RATINGS
-- ============================================================
create table public.player_ratings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  match_id    uuid not null references public.matches(id) on delete cascade,
  player_name text not null,
  team_code   char(3) not null,
  rating      smallint not null check (rating between 1 and 10),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, match_id, player_name)
);

alter table public.player_ratings enable row level security;

create policy "player_ratings_select_all"  on public.player_ratings for select using (true);
create policy "player_ratings_insert_own"  on public.player_ratings for insert with check (auth.uid() = user_id);
create policy "player_ratings_update_own"  on public.player_ratings for update using (auth.uid() = user_id);

-- ============================================================
-- PLAYER OF THE GAME VOTES
-- ============================================================
create table public.potg_votes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  match_id    uuid not null references public.matches(id) on delete cascade,
  player_name text not null,
  team_code   char(3) not null,
  created_at  timestamptz not null default now(),
  unique (user_id, match_id)
);

alter table public.potg_votes enable row level security;

create policy "potg_votes_select_all"   on public.potg_votes for select using (true);
create policy "potg_votes_insert_own"   on public.potg_votes for insert with check (auth.uid() = user_id);
create policy "potg_votes_update_own"   on public.potg_votes for update using (auth.uid() = user_id);

-- ============================================================
-- CHAT MESSAGES (banter room per match)
-- ============================================================
create table public.chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  match_id   uuid not null references public.matches(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 500),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "chat_messages_select_all"
  on public.chat_messages for select using (true);
create policy "chat_messages_insert_own"
  on public.chat_messages for insert with check (auth.uid() = user_id);
create policy "chat_messages_delete_own"
  on public.chat_messages for delete using (auth.uid() = user_id);

create index chat_messages_match_id_idx on public.chat_messages (match_id, created_at desc);

-- ============================================================
-- BRACKET PREDICTIONS
-- ============================================================
create table public.bracket_predictions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  bracket     jsonb not null default '{}',
  -- { round_of_16: [...], quarter_final: [...], semi_final: [...], final: {...}, winner: "BRA" }
  points      integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

alter table public.bracket_predictions enable row level security;

create policy "bracket_predictions_select_all"
  on public.bracket_predictions for select using (true);
create policy "bracket_predictions_insert_own"
  on public.bracket_predictions for insert with check (auth.uid() = user_id);
create policy "bracket_predictions_update_own"
  on public.bracket_predictions for update using (auth.uid() = user_id);

-- ============================================================
-- LEAGUES (private friend groups)
-- ============================================================
create table public.leagues (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  invite_code  text unique not null default upper(substring(md5(random()::text), 1, 8)),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  description  text,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.leagues enable row level security;

create policy "leagues_select_member"
  on public.leagues for select
  using (
    is_public = true
    or owner_id = auth.uid()
    or exists (
      select 1 from public.league_members lm
      where lm.league_id = id and lm.user_id = auth.uid()
    )
  );
create policy "leagues_insert_auth"
  on public.leagues for insert with check (auth.uid() = owner_id);
create policy "leagues_update_owner"
  on public.leagues for update using (auth.uid() = owner_id);
create policy "leagues_delete_owner"
  on public.leagues for delete using (auth.uid() = owner_id);

-- ============================================================
-- LEAGUE MEMBERS
-- ============================================================
create table public.league_members (
  id         uuid primary key default uuid_generate_v4(),
  league_id  uuid not null references public.leagues(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  unique (league_id, user_id)
);

alter table public.league_members enable row level security;

create policy "league_members_select_member"
  on public.league_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.leagues l
      where l.id = league_id
        and (l.owner_id = auth.uid() or l.is_public = true)
    )
  );
create policy "league_members_insert_self"
  on public.league_members for insert with check (auth.uid() = user_id);
create policy "league_members_delete_self"
  on public.league_members for delete using (auth.uid() = user_id);

-- ============================================================
-- LEADERBOARD VIEW
-- ============================================================
create or replace view public.leaderboard as
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.country_code,
    p.total_points,
    rank() over (order by p.total_points desc) as rank
  from public.profiles p
  order by p.total_points desc;

-- ============================================================
-- HELPER: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- HELPER: updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.score_predictions
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.lineup_predictions
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.player_ratings
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.bracket_predictions
  for each row execute procedure public.set_updated_at();
