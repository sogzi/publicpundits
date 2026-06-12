import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLineups, mapPosition } from "@/lib/football-api";

/**
 * Syncs confirmed lineups from livescore-api.com for matches
 * kicking off within 60 minutes, currently live, or finished.
 *
 * POST /api/sync-lineups   Header: Authorization: Bearer <SYNC_SECRET>
 * GET  /api/sync-lineups?secret=<SYNC_SECRET>
 *
 * livescore-api player shape:
 *   { id, name, substitution: "0"|"1", shirt_number, position: "GK"|"DF"|"MF"|"FW" }
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const now   = new Date();
    const in60  = new Date(now.getTime() + 60 * 60 * 1000);

    const { data: matches, error: matchErr } = await (admin as any)
      .from("matches")
      .select("id, api_football_id, status, kickoff_at, home_team_code, away_team_code, home_team, away_team")
      .not("api_football_id", "is", null)
      .or(`status.eq.live,status.eq.finished,and(status.eq.upcoming,kickoff_at.lte.${in60.toISOString()})`);

    if (matchErr) throw matchErr;
    if (!matches?.length) {
      return NextResponse.json({ message: "No eligible matches", synced: 0 });
    }

    // Skip matches that already have both lineups
    const matchIds = (matches as any[]).map((m: any) => m.id);
    const { data: existing } = await (admin as any)
      .from("confirmed_lineups")
      .select("match_id")
      .in("match_id", matchIds);

    const countByMatch = ((existing as any[]) ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.match_id] = (acc[r.match_id] ?? 0) + 1;
      return acc;
    }, {});
    const alreadyDone = new Set(
      Object.entries(countByMatch).filter(([, c]) => c >= 2).map(([id]) => id)
    );

    const toSync = (matches as any[]).filter((m: any) => !alreadyDone.has(m.id));
    if (!toSync.length) {
      return NextResponse.json({ message: "All eligible matches already have lineups", synced: 0 });
    }

    const results: { matchId: string; teams?: string; status: string }[] = [];

    for (const match of toSync) {
      try {
        const lineup = await getLineups(match.api_football_id);

        if (!lineup) {
          results.push({ matchId: match.id, status: "not_available_yet" });
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        // livescore: substitution "0" = starter, "1" = sub
        const mapPlayers = (players: typeof lineup.home.players) =>
          players.map((p) => ({
            name:         p.name,
            shirt_number: parseInt(p.shirt_number) || 0,
            position:     mapPosition(p.position),
            starter:      p.substitution === "0",
          }));

        const rows = [
          {
            match_id:    match.id,
            team_code:   match.home_team_code,
            team_name:   match.home_team,
            formation:   null,
            start_xi:    mapPlayers(lineup.home.players.filter((p) => p.substitution === "0")),
            substitutes: mapPlayers(lineup.home.players.filter((p) => p.substitution === "1")),
            coach:       null,
            fetched_at:  new Date().toISOString(),
          },
          {
            match_id:    match.id,
            team_code:   match.away_team_code,
            team_name:   match.away_team,
            formation:   null,
            start_xi:    mapPlayers(lineup.away.players.filter((p) => p.substitution === "0")),
            substitutes: mapPlayers(lineup.away.players.filter((p) => p.substitution === "1")),
            coach:       null,
            fetched_at:  new Date().toISOString(),
          },
        ];

        const { error } = await (admin as any)
          .from("confirmed_lineups")
          .upsert(rows, { onConflict: "match_id,team_code" });

        if (error) throw error;
        results.push({ matchId: match.id, teams: `${match.home_team} vs ${match.away_team}`, status: "synced" });
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        results.push({ matchId: match.id, status: `error: ${err instanceof Error ? err.message : String(err)}` });
      }
    }

    return NextResponse.json({
      results,
      synced: results.filter((r) => r.status === "synced").length,
      total:  toSync.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync-lineups]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return POST(new Request(request.url, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.SYNC_SECRET}` },
  }));
}
