import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePrediction } from "@/lib/prediction-engine";

/**
 * Generates predictions for ALL matches that are missing one in platform_predictions.
 *
 * Uses fastMode by default (rankings + stage weight only, no external API calls)
 * so it can process all 104 matches instantly without hitting rate limits.
 *
 * Pass ?full=true to use the full engine (form + H2H via football-data.org).
 * Full mode makes ~3 API calls per match — only safe for small batches due to
 * football-data.org free tier limit of 10 req/min.
 *
 * GET  /api/predictions/generate-all?secret=<SYNC_SECRET>
 * GET  /api/predictions/generate-all?secret=<SYNC_SECRET>&full=true
 * GET  /api/predictions/generate-all?secret=<SYNC_SECRET>&status=upcoming  (filter by status)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("secret") !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fullMode     = searchParams.get("full") === "true";
  const statusFilter = searchParams.get("status"); // "upcoming" | "live" | "finished" | null (all)

  const admin = createAdminClient();

  // ── 1. Find all matches missing a prediction ────────────────────────────
  let matchQuery = admin.from("matches").select("id, home_team, away_team, status");
  if (statusFilter) matchQuery = matchQuery.eq("status", statusFilter);
  const { data: allMatches, error: matchErr } = await matchQuery;
  if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 });

  const { data: existingPreds } = await admin
    .from("platform_predictions")
    .select("match_id");

  const predictedIds = new Set((existingPreds ?? []).map((p) => p.match_id));
  const missing = (allMatches ?? []).filter((m) => !predictedIds.has(m.id));

  if (missing.length === 0) {
    const scope = statusFilter ? `status=${statusFilter}` : "all matches";
    return NextResponse.json({ message: `All ${scope} already have predictions`, generated: 0 });
  }

  // ── 2. Generate predictions ─────────────────────────────────────────────
  const results: Array<{ matchId: string; teams: string; status: string }> = [];

  for (const match of missing) {
    try {
      await generatePrediction(match.id, { fastMode: !fullMode });
      results.push({
        matchId: match.id,
        teams: `${match.home_team} vs ${match.away_team}`,
        status: "generated",
      });

      // Full mode: respect football-data.org 10 req/min (3 calls per match → ~2.5s gap)
      if (fullMode) await new Promise((r) => setTimeout(r, 2500));
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      results.push({ matchId: match.id, teams: `${match.home_team} vs ${match.away_team}`, status: `error: ${msg}` });
    }
  }

  const generated = results.filter((r) => r.status === "generated").length;
  const failed    = results.filter((r) => r.status.startsWith("error")).length;

  return NextResponse.json({
    mode: fullMode ? "full (rankings + form + H2H)" : "fast (rankings + stage weight only)",
    missing: missing.length,
    generated,
    failed,
    results,
  });
}
