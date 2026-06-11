import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MatchPageClient } from "@/components/match/MatchPageClient";
import type { LineupPlayer, SquadPlayer } from "@/types/database";

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
    { data: confirmedLineups },
    { data: homeSquad },
    { data: awaySquad },
    { data: chatMessages },
    { data: allRatings },
    { data: potgVotes },
    { data: userRatings },
    { data: userPotg },
  ] = await Promise.all([
    // Platform AI prediction
    (admin as any).from("platform_predictions").select("*").eq("match_id", id).maybeSingle(),
    // User's score prediction
    user
      ? (supabase as any).from("score_predictions").select("*").eq("match_id", id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    // User's home lineup prediction
    user
      ? (supabase as any).from("lineup_predictions").select("*").eq("match_id", id).eq("user_id", user.id).eq("team_code", match.home_team_code).maybeSingle()
      : Promise.resolve({ data: null }),
    // User's away lineup prediction
    user
      ? (supabase as any).from("lineup_predictions").select("*").eq("match_id", id).eq("user_id", user.id).eq("team_code", match.away_team_code).maybeSingle()
      : Promise.resolve({ data: null }),
    // Confirmed lineups from API sync
    (admin as any).from("confirmed_lineups").select("*").eq("match_id", id),
    // Squads for lineup picker
    (admin as any).from("squads").select("players, team_name").eq("team_code", match.home_team_code).maybeSingle(),
    (admin as any).from("squads").select("players, team_name").eq("team_code", match.away_team_code).maybeSingle(),
    // Chat messages with profile info
    (admin as any)
      .from("chat_messages")
      .select("*, profiles(username, display_name, avatar_url)")
      .eq("match_id", id)
      .order("created_at", { ascending: true })
      .limit(50),
    // All player ratings for this match (for community averages)
    (admin as any).from("player_ratings").select("player_name, team_code, rating").eq("match_id", id),
    // All potg votes
    (admin as any).from("potg_votes").select("player_name, team_code").eq("match_id", id),
    // User's own ratings
    user
      ? (supabase as any).from("player_ratings").select("player_name, rating").eq("match_id", id).eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    // User's potg vote
    user
      ? (supabase as any).from("potg_votes").select("player_name").eq("match_id", id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

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

  // ── Build player list from confirmed lineups ────────────────────────────────
  const allPlayers: Array<{ name: string; team_code: string; position: string; shirt: number }> = [];
  for (const lineup of confirmedLineups ?? []) {
    const xi  = (lineup.start_xi  as LineupPlayer[] | null) ?? [];
    const sub = (lineup.substitutes as LineupPlayer[] | null) ?? [];
    for (const p of [...xi, ...sub]) {
      if (p.name) allPlayers.push({ name: p.name, team_code: lineup.team_code, position: p.position, shirt: p.shirt_number });
    }
  }

  return (
    <MatchPageClient
      match={match}
      userId={user?.id ?? null}
      platformPrediction={platformPred}
      userScorePrediction={scorePred}
      homeLineupPrediction={homeLineupPred ? (homeLineupPred.players as LineupPlayer[]) : null}
      awayLineupPrediction={awayLineupPred ? (awayLineupPred.players as LineupPlayer[]) : null}
      confirmedLineups={confirmedLineups ?? []}
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
