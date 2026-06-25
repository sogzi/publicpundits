import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMatchStats } from "@/lib/football-api";

/**
 * GET /api/match-stats?matchId={uuid}
 *
 * Returns livescore match statistics formatted as home/away pairs.
 * Uses livescore_id (internal ID) for the API call.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");

  if (!matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: match, error } = await (admin as any)
    .from("matches")
    .select("id, livescore_id, home_team_code, away_team_code, status")
    .eq("id", matchId)
    .single();

  if (error || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.status === "upcoming") {
    return NextResponse.json({ notAvailable: true, reason: "match_not_started" });
  }

  if (!match.livescore_id) {
    return NextResponse.json({ notAvailable: true, reason: "no_livescore_id" });
  }

  const raw = await getMatchStats(match.livescore_id);

  if (!raw) {
    return NextResponse.json({ notAvailable: true, reason: "stats_not_available" });
  }

  // Parse "home:away" colon-separated strings into numeric pairs
  function parsePair(val: string | undefined): [number, number] | null {
    if (!val) return null;
    const parts = val.split(":").map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) return null;
    return [parts[0], parts[1]];
  }

  function parseNum(val: string | undefined): number | null {
    if (!val) return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  }

  const possession = parsePair(raw.possesion);
  const shotsOn    = parsePair(raw.shots_on_target);
  const shotsOff   = parsePair(raw.shots_off_target);
  const shotsBlk   = parsePair(raw.shots_blocked);
  const corners    = parsePair(raw.corners);
  const yellows    = parsePair(raw.yellow_cards);
  const reds       = parsePair(raw.red_cards);
  const fouls      = parsePair(raw.fauls);
  const offsides   = parsePair(raw.offsides);

  // Total shots = on_target + off_target + blocked
  let totalShots: [number, number] | null = null;
  if (shotsOn && shotsOff && shotsBlk) {
    totalShots = [shotsOn[0] + shotsOff[0] + shotsBlk[0], shotsOn[1] + shotsOff[1] + shotsBlk[1]];
  } else if (shotsOn && shotsOff) {
    totalShots = [shotsOn[0] + shotsOff[0], shotsOn[1] + shotsOff[1]];
  }

  return NextResponse.json({
    homeCode: match.home_team_code,
    awayCode: match.away_team_code,
    stats: [
      { label: "Possession",       format: "percent", values: possession },
      { label: "Total Shots",      format: "number",  values: totalShots },
      { label: "Shots on Target",  format: "number",  values: shotsOn },
      { label: "Corners",          format: "number",  values: corners },
      { label: "Fouls",            format: "number",  values: fouls },
      { label: "Offsides",         format: "number",  values: offsides },
      { label: "Yellow Cards",     format: "number",  values: yellows },
      { label: "Red Cards",        format: "number",  values: reds },
    ].filter((s) => s.values !== null),
  });
}
