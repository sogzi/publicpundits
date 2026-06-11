import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSquads, mapPosition } from "@/lib/football-api";

/**
 * Fetches all 48 WC2026 squads from football-data.org in a single call
 * and upserts them into the squads table.
 *
 * POST /api/sync-squads
 * Header: Authorization: Bearer <SYNC_SECRET>
 *
 * Run once after squads are officially confirmed (typically ~2 weeks before tournament).
 * Can be re-run to pick up any late squad changes.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const teams = await getSquads();

    if (!teams.length) {
      return NextResponse.json({ message: "No teams returned from API", synced: 0 });
    }

    const admin = createAdminClient();

    const rows = teams.map((team) => ({
      team_code:  team.tla,
      team_name:  team.name,
      team_fd_id: team.id,
      players: team.squad.map((p) => ({
        id:          p.id,
        name:        p.name,
        position:    mapPosition(p.position),   // "GK" | "DEF" | "MID" | "FWD"
        positionFull: p.position,               // full label for display
        shirtNumber: p.shirtNumber,
        dateOfBirth: p.dateOfBirth,
        nationality: p.nationality,
      })),
      synced_at: new Date().toISOString(),
    }));

    const { error, count } = await admin
      .from("squads")
      .upsert(rows, { onConflict: "team_code", count: "exact" });

    if (error) throw error;

    return NextResponse.json({
      message: "Squads synced successfully",
      synced: count,
      total: rows.length,
      teams: rows.map((r) => `${r.team_code} (${r.players.length} players)`),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null
        ? JSON.stringify(err)
        : String(err);
    console.error("[sync-squads]", message);
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
