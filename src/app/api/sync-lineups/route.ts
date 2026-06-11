import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLineups } from "@/lib/football-api";

/**
 * Fetches confirmed lineups from football-data.org for every match that:
 *   - kicks off within the next 60 minutes OR is already live/finished
 *   - has an api_football_id set
 *   - doesn't already have both team lineups stored
 *
 * POST /api/sync-lineups
 * Header: Authorization: Bearer <SYNC_SECRET>
 *
 * Designed to be called by a cron job every 5–10 minutes on matchdays.
 * football-data.org free tier: 10 req/min — we add a 700 ms delay between matches.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const now = new Date();
    const in60 = new Date(now.getTime() + 60 * 60 * 1000);

    // Find matches kicking off within 60 min, live, or finished that have an API id
    const { data: matches, error: matchErr } = await admin
      .from("matches")
      .select("id, api_football_id, status, kickoff_at, home_team_code, away_team_code, home_team, away_team")
      .not("api_football_id", "is", null)
      .or(`status.eq.live,status.eq.finished,and(status.eq.upcoming,kickoff_at.lte.${in60.toISOString()})`);

    if (matchErr) throw matchErr;
    if (!matches?.length) {
      return NextResponse.json({ message: "No eligible matches to sync lineups for", synced: 0 });
    }

    // Skip matches that already have both lineups stored
    const matchIds = matches.map((m) => m.id);
    const { data: existing } = await admin
      .from("confirmed_lineups")
      .select("match_id")
      .in("match_id", matchIds);

    const alreadyHaveBoth = new Set(
      Object.entries(
        (existing ?? []).reduce<Record<string, number>>((acc, r) => {
          acc[r.match_id] = (acc[r.match_id] ?? 0) + 1;
          return acc;
        }, {})
      )
        .filter(([, count]) => count >= 2)
        .map(([id]) => id)
    );

    const toSync = matches.filter((m) => !alreadyHaveBoth.has(m.id));
    if (!toSync.length) {
      return NextResponse.json({ message: "All eligible matches already have lineups", synced: 0 });
    }

    const results: { matchId: string; status: string; teams?: number }[] = [];

    for (const match of toSync) {
      try {
        // getLineups returns { homeTeam: FDLineup, awayTeam: FDLineup } | null
        const lineups = await getLineups(match.api_football_id!);

        if (!lineups) {
          results.push({ matchId: match.id, status: "not_available_yet" });
          continue;
        }

        const rows = [
          {
            match_id:    match.id,
            team_code:   match.home_team_code,
            team_name:   match.home_team,
            formation:   lineups.homeTeam.formation ?? null,
            start_xi:    lineups.homeTeam.startXI.map((p) => p.player),
            substitutes: lineups.homeTeam.substitutes.map((p) => p.player),
            coach:       lineups.homeTeam.coach?.name ?? null,
            fetched_at:  new Date().toISOString(),
          },
          {
            match_id:    match.id,
            team_code:   match.away_team_code,
            team_name:   match.away_team,
            formation:   lineups.awayTeam.formation ?? null,
            start_xi:    lineups.awayTeam.startXI.map((p) => p.player),
            substitutes: lineups.awayTeam.substitutes.map((p) => p.player),
            coach:       lineups.awayTeam.coach?.name ?? null,
            fetched_at:  new Date().toISOString(),
          },
        ];

        const { error } = await admin
          .from("confirmed_lineups")
          .upsert(rows, { onConflict: "match_id,team_code" });

        if (error) throw error;
        results.push({ matchId: match.id, status: "synced", teams: rows.length });

        // Respect football-data.org free tier: 10 req/min
        await new Promise((r) => setTimeout(r, 700));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ matchId: match.id, status: `error: ${msg}` });
      }
    }

    return NextResponse.json({
      results,
      synced: results.filter((r) => r.status === "synced").length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync-lineups]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const fakeRequest = new Request(request.url, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.SYNC_SECRET}` },
  });
  return POST(fakeRequest);
}
