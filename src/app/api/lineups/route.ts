import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLineups, mapPosition } from "@/lib/football-api";

/**
 * GET /api/lineups?matchId={uuid}
 *
 * 1. Check the `lineups` table in Supabase for both teams.
 * 2. If found → return immediately (no API call).
 * 3. If not found → call livescore-api /matches/lineups.json, normalize, upsert, return.
 *
 * livescore-api player shape:
 *   { id, name, substitution: "0"|"1", shirt_number, position: "GK"|"DF"|"MF"|"FW" }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");

  if (!matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── 1. Look up match ────────────────────────────────────────────────────────
  const { data: match, error: matchErr } = await (admin as any)
    .from("matches")
    .select("id, api_football_id, home_team, away_team, home_team_code, away_team_code, status")
    .eq("id", matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // ── 2. Check lineups table ──────────────────────────────────────────────────
  const { data: stored } = await (admin as any)
    .from("lineups")
    .select("team, formation, players, confirmed")
    .eq("match_id", matchId);

  const storedHome = (stored ?? []).find((r: any) => r.team === match.home_team_code);
  const storedAway = (stored ?? []).find((r: any) => r.team === match.away_team_code);

  if (storedHome && storedAway) {
    return NextResponse.json({
      source: "cache",
      home: buildTeamPayload(match.home_team, match.home_team_code, storedHome),
      away: buildTeamPayload(match.away_team, match.away_team_code, storedAway),
    });
  }

  // ── 3. Fetch from livescore-api ─────────────────────────────────────────────
  if (!match.api_football_id) {
    return NextResponse.json({ notAvailable: true, reason: "no_fixture_id" });
  }

  const lineup = await getLineups(match.api_football_id);

  if (!lineup) {
    return NextResponse.json({ notAvailable: true, reason: "not_published_yet" });
  }

  // ── 4. Normalise & upsert ───────────────────────────────────────────────────
  // livescore-api: substitution "0" = starter, "1" = sub
  const confirmedLineup = lineup; // narrowed non-null ref for use inside closures
  function normalisePlayers(players: typeof confirmedLineup.home.players) {
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
    players:   normalisePlayers(confirmedLineup.home.players),
    confirmed: true,
  };

  const awayRow = {
    match_id:  matchId,
    team:      match.away_team_code,
    formation: null,
    players:   normalisePlayers(confirmedLineup.away.players),
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
