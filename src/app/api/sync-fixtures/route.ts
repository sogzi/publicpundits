import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getFixtures,
  mapStage,
  mapStatus,
  mapGroup,
  teamCode,
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
      const stage = mapStage(f.league.round);
      const kickoff = f.fixture.date;
      const isGroupMd3 = stage === "group" && f.league.round.includes("3");

      return {
        api_football_id:      f.fixture.id,
        home_team:            f.teams.home.name,
        away_team:            f.teams.away.name,
        home_team_code:       teamCode(f.teams.home.name),
        away_team_code:       teamCode(f.teams.away.name),
        kickoff_at:           kickoff,
        stage,
        group_name:           mapGroup(f.league.group),
        venue:                f.fixture.venue.name
                                ? `${f.fixture.venue.name}${f.fixture.venue.city ? ", " + f.fixture.venue.city : ""}`
                                : null,
        status:               mapStatus(f.fixture.status.short),
        home_score:           f.goals.home,
        away_score:           f.goals.away,
        // Lock simultaneous group-stage matchday-3 fixtures 15 min early
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
    const message = err instanceof Error ? err.message : String(err);
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
