import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLineups, mapPosition } from "@/lib/football-api";

/**
 * GET /api/lineups?matchId={uuid}
 *
 * Uses livescore_id (internal livescore match ID) for API calls, NOT api_football_id
 * (which is the fixture planning ID and only works for score sync, not lineups/stats).
 *
 * Cache validation: reject cached lineups where both teams have 0 players —
 * this happens when a wrong match_id was used previously (cross-contamination bug).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");

  if (!matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── 1. Look up match (include livescore_id) ─────────────────────────────────
  const { data: match, error: matchErr } = await (admin as any)
    .from("matches")
    .select("id, api_football_id, livescore_id, home_team, away_team, home_team_code, away_team_code, status")
    .eq("id", matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // ── 2. Check lineups cache ──────────────────────────────────────────────────
  const { data: stored } = await (admin as any)
    .from("lineups")
    .select("team, formation, players, confirmed")
    .eq("match_id", matchId);

  const storedHome = (stored ?? []).find((r: any) => r.team === match.home_team_code);
  const storedAway = (stored ?? []).find((r: any) => r.team === match.away_team_code);

  // Reject cache if both teams have empty player arrays (bad fetch from wrong match_id)
  const cacheValid =
    storedHome && storedAway &&
    (storedHome.players.length > 0 || storedAway.players.length > 0);

  if (cacheValid) {
    return NextResponse.json({
      source: "cache",
      home: buildTeamPayload(match.home_team, match.home_team_code, storedHome),
      away: buildTeamPayload(match.away_team, match.away_team_code, storedAway),
    });
  }

  // ── 3. Need livescore internal ID to fetch lineups ──────────────────────────
  const liveScoreId: number | null = match.livescore_id ?? null;

  if (!liveScoreId) {
    return NextResponse.json({ notAvailable: true, reason: "no_livescore_id" });
  }

  // ── 4. Fetch from livescore-api using internal match ID ─────────────────────
  const lineup = await getLineups(liveScoreId);

  if (!lineup) {
    return NextResponse.json({ notAvailable: true, reason: "not_published_yet" });
  }

  // ── 5. Normalise & upsert ───────────────────────────────────────────────────
  function normalisePlayers(players: typeof lineup.home.players) {
    return players.map((p) => ({
      name:    p.name,
      shirt:   parseInt(p.shirt_number) || 0,
      pos:     mapPosition(p.position),
      grid:    null,
      starter: p.substitution === "0",
    }));
  }

  const homeRow = {
    match_id:  matchId,
    team:      match.home_team_code,
    formation: null,
    players:   normalisePlayers(lineup.home.players),
    confirmed: true,
  };

  const awayRow = {
    match_id:  matchId,
    team:      match.away_team_code,
    formation: null,
    players:   normalisePlayers(lineup.away.players),
    confirmed: true,
  };

  await (admin as any)
    .from("lineups")
    .upsert([homeRow, awayRow], { onConflict: "match_id,team" });

  return NextResponse.json({
    source: "api",
    home: buildTeamPayload(match.home_team, match.home_team_code, homeRow),
    away: buildTeamPayload(match.away_team, match.away_team_code, awayRow),
  });
}

function buildTeamPayload(
  teamName: string,
  teamCode: string,
  row: { formation: string | null; players: any[] }
) {
  const starters = row.players.filter((p: any) => p.starter !== false);
  const subs     = row.players.filter((p: any) => p.starter === false);
  return {
    teamName,
    teamCode,
    formation: row.formation ?? null,
    starters,
    subs,
  };
}
