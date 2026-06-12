import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getFixtures, getMatchHistory, getLiveScores,
  mapStatus, mapStage, mapGroup, parseScore, kickoffIso, lockTime, nameToTla,
} from "@/lib/football-api";

/**
 * Syncs all WC2026 fixtures + results from livescore-api.com.
 *
 * Strategy:
 *  1. Fetch upcoming fixtures + match history + live scores (3 API calls)
 *  2. For each livescore match, update the existing DB row matched by
 *     (home_team_code, away_team_code) — setting api_football_id to the
 *     livescore internal ID, plus status and scores.
 *  3. Any truly new match (knockout TBDs) is inserted fresh.
 *
 * POST /api/sync-fixtures   Header: Authorization: Bearer <SYNC_SECRET>
 * GET  /api/sync-fixtures?secret=<SYNC_SECRET>
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── 1. Fetch from livescore-api (3 calls) ─────────────────────────────────
    const [upcoming, history, live] = await Promise.all([
      getFixtures(),
      getMatchHistory(),
      getLiveScores(),
    ]);

    // Deduplicate by livescore internal id (live matches appear in multiple lists)
    const byId = new Map<number, (typeof upcoming)[number]>();
    for (const m of [...upcoming, ...history, ...live]) {
      byId.set(m.id, m); // later entries (live) overwrite earlier ones
    }
    const allMatches = Array.from(byId.values());

    if (!allMatches.length) {
      return NextResponse.json({ message: "No matches returned from API", synced: 0 });
    }

    const admin = createAdminClient();

    // ── 2. Build TLA-pair → DB match lookup ──────────────────────────────────
    const { data: dbMatches } = await (admin as any)
      .from("matches")
      .select("id, home_team_code, away_team_code, api_football_id");

    const dbByPair = new Map<string, string>(); // "MEX_RSA" → db uuid
    for (const row of dbMatches ?? []) {
      dbByPair.set(`${row.home_team_code}_${row.away_team_code}`, row.id);
    }

    // ── 3. Sync each match ────────────────────────────────────────────────────
    let updated = 0;
    let inserted = 0;
    const errors: string[] = [];

    for (const m of allMatches) {
      try {
        const homeTla = nameToTla(m.home?.name ?? "");
        const awayTla = nameToTla(m.away?.name ?? "");
        const status  = mapStatus(m);
        const ftScore = parseScore(m.scores?.ft_score);
        const lsId    = m.id;
        const ko      = kickoffIso(m);
        const stage   = mapStage(m);
        const group   = mapGroup(m.group_id);
        const isMd3   = stage === "group" && m.round === "3";

        const pair = `${homeTla}_${awayTla}`;
        const dbId = dbByPair.get(pair);

        if (dbId) {
          // Update existing row
          const { error } = await (admin as any)
            .from("matches")
            .update({
              api_football_id: lsId,
              status,
              home_score: ftScore.home,
              away_score: ftScore.away,
            })
            .eq("id", dbId);
          if (error) throw error;
          updated++;
        } else {
          // Insert new match (knockout TBDs, genuinely new fixtures)
          const { error } = await (admin as any)
            .from("matches")
            .insert({
              api_football_id:       lsId,
              home_team:             m.home?.name ?? "TBD",
              away_team:             m.away?.name ?? "TBD",
              home_team_code:        homeTla,
              away_team_code:        awayTla,
              kickoff_at:            ko,
              stage,
              group_name:            group,
              venue:                 null,
              status,
              home_score:            ftScore.home,
              away_score:            ftScore.away,
              predictions_locked_at: isMd3 ? lockTime(ko) : null,
            });
          if (error) throw error;
          inserted++;
        }
      } catch (err) {
        errors.push(`${m.home?.name} vs ${m.away?.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      message: "Fixtures synced",
      updated,
      inserted,
      total: allMatches.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync-fixtures]", message);
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
