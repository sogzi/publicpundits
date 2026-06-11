import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getFixtures,
  mapStage,
  mapStatus,
  mapGroup,
  lockTime,
} from "@/lib/football-api";

// Protect with a secret token: POST /api/sync-fixtures
// Header: Authorization: Bearer <SYNC_SECRET>
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const fixtures = await getFixtures();

    if (!fixtures.length) {
      return NextResponse.json({ message: "No fixtures returned from API", synced: 0 });
    }

    const admin = createAdminClient();

    const rows = fixtures.map((f) => {
      const stage = mapStage(f.stage);
      const kickoff = f.utcDate;
      // Lock simultaneous group-stage matchday-3 games 15 min early
      const isGroupMd3 = stage === "group" && f.matchday === 3;

      return {
        api_football_id:       f.id,
        home_team:             f.homeTeam.name  ?? "TBD",
        away_team:             f.awayTeam.name  ?? "TBD",
        home_team_code:        f.homeTeam.tla   ?? "TBD",  // null for unresolved knockout fixtures
        away_team_code:        f.awayTeam.tla   ?? "TBD",
        kickoff_at:            kickoff,
        stage,
        group_name:            mapGroup(f.group),
        venue:                 null,              // football-data.org free tier omits venue
        status:                mapStatus(f.status),
        home_score:            f.score.fullTime.home,
        away_score:            f.score.fullTime.away,
        predictions_locked_at: isGroupMd3 ? lockTime(kickoff) : null,
      };
    });

    const { error, count } = await admin
      .from("matches")
      .upsert(rows, { onConflict: "api_football_id", count: "exact" });

    if (error) throw error;

    return NextResponse.json({
      message: "Fixtures synced successfully",
      synced: count,
      total: rows.length,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null
        ? JSON.stringify(err)
        : String(err);
    console.error("[sync-fixtures]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET for quick health-check / manual browser trigger during dev
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Re-use POST logic via a fake request
  const fakeRequest = new Request(request.url, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.SYNC_SECRET}` },
  });
  return POST(fakeRequest);
}
