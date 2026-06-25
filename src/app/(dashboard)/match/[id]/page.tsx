import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MatchPageClient } from "@/components/match/MatchPageClient";
import type { SquadPlayer } from "@/types/database";

export const revalidate = 30;

export default async function MatchPage({ params }: { params: { id: string } }) {
  const supabase  = createClient();
  const admin     = createAdminClient();
  const { id }    = params;

  const { data: { user } } = await supabase.auth.getUser();

  // ── Core match data ────────────────────────────────────────────────────────
  const { data: match } = await (admin as any)
    .from("matches")
    .select("*")
    .eq("id", id)
    .single();

  if (!match) notFound();

  // ── Parallel data fetch ────────────────────────────────────────────────────
  const [
    { data: platformPred },
    { data: scorePred },
    { data: homeLineupPred },
    { data: awayLineupPred },
    { data: fetchedLineups },
    { data: homeSquad },
    { data: awaySquad },
    { data: chatMessages },
    { data: allRatings },
    { data: potgVotes },
    { data: userRatings },
    { data: userPotg },
  ] = await Promise.all([
    (admin as any).from("platform_predictions").select("*").eq("match_id", id).maybeSingle(),
    user
      ? (supabase as any).from("score_predictions").select("*").eq("match_id", id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? (supabase as any).from("lineup_predictions").select("*").eq("match_id", id).eq("user_id", user.id).eq("team_code", match.home_team_code).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? (supabase as any).from("lineup_predictions").select("*").eq("match_id", id).eq("user_id", user.id).eq("team_code", match.away_team_code).maybeSingle()
      : Promise.resolve({ data: null }),
    Promise.resolve({ data: [] }),   // lineups now fetched client-side in LineupsTab
    (admin as any).from("squads").select("players, team_name").eq("team_code", match.home_team_code).maybeSingle(),
    (admin as any).from("squads").select("players, team_name").eq("team_code", match.away_team_code).maybeSingle(),
    (admin as any)
      .from("chat_messages")
      .select("*, profiles(username, display_name, avatar_url)")
      .eq("match_id", id)
      .order("created_at", { ascending: true })
      .limit(50),
    (admin as any).from("player_ratings").select("player_name, team_code, rating").eq("match_id", id),
    (admin as any).from("potg_votes").select("player_name, team_code").eq("match_id", id),
    user
      ? (supabase as any).from("player_ratings").select("player_name, rating").eq("match_id", id).eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    user
      ? (supabase as any).from("potg_votes").select("player_name").eq("match_id", id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Lineups are fetched client-side by LineupsTab via /api/lineups
  const confirmedLineups = fetchedLineups ?? [];

  // ── Aggregate community ratings ────────────────────────────────────────────
  const ratingAgg: Record<string, { team_code: string; sum: number; count: number }> = {};
  for (const r of allRatings ?? []) {
    if (!ratingAgg[r.player_name]) ratingAgg[r.player_name] = { team_code: r.team_code, sum: 0, count: 0 };
    ratingAgg[r.player_name].sum += r.rating;
    ratingAgg[r.player_name].count++;
  }
  const userRatingMap: Record<string, number> = Object.fromEntries(
    (userRatings ?? []).map((r: any) => [r.player_name, r.rating])
  );

  // ── Aggregate potg vote counts ─────────────────────────────────────────────
  const potgAgg: Record<string, { team_code: string; votes: number }> = {};
  for (const v of potgVotes ?? []) {
    if (!potgAgg[v.player_name]) potgAgg[v.player_name] = { team_code: v.team_code, votes: 0 };
    potgAgg[v.player_name].votes++;
  }

  // allPlayers for Rate/POTG tabs.
  // Priority: confirmed lineups (starters + subs) → squad fallback
  const { data: storedLineups } = await (admin as any)
    .from("lineups")
    .select("team, players")
    .eq("match_id", id);

  let allPlayers: Array<{ name: string; team_code: string; position: string; shirt: number }> = [];

  // Only use stored lineups if they actually have players (guard against bad-cache rows with 0 players)
  const totalStoredPlayers = (storedLineups ?? []).reduce((sum: number, row: any) => sum + (row.players?.length ?? 0), 0);

  if (storedLineups && storedLineups.length >= 2 && totalStoredPlayers > 0) {
    for (const row of storedLineups) {
      for (const p of row.players ?? []) {
        allPlayers.push({
          name:      p.name,
          team_code: row.team,
          position:  p.pos ?? p.position ?? "MID",
          shirt:     p.shirt ?? p.shirt_number ?? 0,
        });
      }
    }
  } else {
    // Fall back to full squad for both teams
    const squads = [
      { squad: homeSquad, code: match.home_team_code },
      { squad: awaySquad, code: match.away_team_code },
    ];
    for (const { squad, code } of squads) {
      for (const p of (squad?.players as any[]) ?? []) {
        allPlayers.push({
          name:      p.name,
          team_code: code,
          position:  p.position ?? "MID",
          shirt:     p.shirtNumber ?? 0,
        });
      }
    }
  }

  return (
    <MatchPageClient
      match={match}
      userId={user?.id ?? null}
      platformPrediction={platformPred}
      userScorePrediction={scorePred}
      homeLineupPrediction={homeLineupPred ? (homeLineupPred.players as any[]) : null}
      awayLineupPrediction={awayLineupPred ? (awayLineupPred.players as any[]) : null}
      confirmedLineups={confirmedLineups}
      homeSquad={(homeSquad?.players as SquadPlayer[]) ?? []}
      awaySquad={(awaySquad?.players as SquadPlayer[]) ?? []}
      chatMessages={(chatMessages ?? []) as any}
      ratingAgg={ratingAgg}
      userRatingMap={userRatingMap}
      potgAgg={potgAgg}
      userPotgVote={userPotg?.player_name ?? null}
      allPlayers={allPlayers}
    />
  );
}
