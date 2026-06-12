import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFixtures, getMatchHistory, getSquadForTeam, mapPosition, nameToTla, LIVESCORE_NAME_TO_TLA } from "@/lib/football-api";

/**
 * Syncs WC2026 squads from livescore-api.com.
 *
 * Flow:
 *   1. Collect all unique team IDs from fixtures + history (avoids a separate teams-list call)
 *   2. For each team, call /competitions/squads.json?competition_id=362&team_id=X
 *   3. Upsert into `squads` table
 *
 * livescore squad player shape: { id, name, shirt_number, position: "GK"|"DF"|"MF"|"FW" }
 *
 * POST /api/sync-squads   Header: Authorization: Bearer <SYNC_SECRET>
 * GET  /api/sync-squads?secret=<SYNC_SECRET>
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── 1. Collect all WC team IDs from fixtures + history ────────────────────
    const [fixtures, history] = await Promise.all([getFixtures(), getMatchHistory()]);
    const allMatches = [...fixtures, ...history];

    const teamMap = new Map<number, string>(); // teamId → teamName
    for (const m of allMatches) {
      if (m.home?.id) teamMap.set(Number(m.home.id), m.home.name);
      if (m.away?.id) teamMap.set(Number(m.away.id), m.away.name);
    }

    if (!teamMap.size) {
      return NextResponse.json({ message: "No teams found in fixtures/history", synced: 0 });
    }

    const admin   = createAdminClient();
    const results: { team: string; players: number; status: string }[] = [];

    // ── 2. Fetch squad per team ────────────────────────────────────────────────
    for (const [teamId, teamName] of teamMap.entries()) {
      try {
        await new Promise((r) => setTimeout(r, 400)); // rate limit safety

        const squad = await getSquadForTeam(teamId);

        if (!squad || squad.length === 0) {
          results.push({ team: teamName, players: 0, status: "no_squad_data" });
          continue;
        }

        const tla = nameToTla(teamName);
        const players = squad.map((p) => ({
          id:           parseInt(p.id),
          name:         p.name,
          position:     mapPosition(p.position),
          positionFull: p.position,
          shirtNumber:  parseInt(p.shirt_number) || null,
        }));

        const { error } = await (admin as any)
          .from("squads")
          .upsert(
            {
              team_code:  tla,
              team_name:  teamName,
              team_fd_id: teamId,   // livescore team ID stored here
              players,
              synced_at:  new Date().toISOString(),
            },
            { onConflict: "team_code" }
          );

        if (error) throw error;
        results.push({ team: teamName, players: players.length, status: "synced" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ team: teamName, players: 0, status: `error: ${msg}` });
      }
    }

    const synced = results.filter((r) => r.status === "synced").length;
    const failed = results.filter((r) => r.status.startsWith("error")).length;

    return NextResponse.json({
      message: "Squads sync complete",
      synced,
      failed,
      total: teamMap.size,
      teams: results.map((r) => `${r.team} — ${r.players} players (${r.status})`),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message
      : typeof err === "object" && err !== null ? JSON.stringify(err)
      : String(err);
    console.error("[sync-squads]", message);
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
