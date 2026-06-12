/**
 * Supabase Edge Function: calculate-points
 *
 * Called after a match finishes (or manually via POST).
 * Compares every user's score_predictions against the actual result
 * and awards points:
 *   - Correct scoreline           → 3 pts
 *   - Correct outcome (W/D/L)     → 1 pt
 *   - Wrong                       → 0 pts
 *
 * Lineup bonus (per team predicted, max 5 pts per match):
 *   - Each player predicted in correct position who actually started → 0.5 pts
 *   (Lineup points are additive on top of score prediction points)
 *
 * Body: { match_id: string }
 * OR    { recalculate_all: true }  — recalculates every finished match
 *
 * Required Supabase secrets (auto-injected):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// Outcome helper
// ─────────────────────────────────────────────────────────────────────────────

function outcome(home: number, away: number): "H" | "D" | "A" {
  if (home > away) return "H";
  if (home < away) return "A";
  return "D";
}

// ─────────────────────────────────────────────────────────────────────────────
// Points calculation for one match
// ─────────────────────────────────────────────────────────────────────────────

async function calculateForMatch(supabase: ReturnType<typeof createClient>, matchId: string): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];

  // Load match
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select("id, home_score, away_score, status, stage, home_team_code, away_team_code")
    .eq("id", matchId)
    .single();

  if (matchErr || !match) {
    return { processed: 0, errors: [`Match ${matchId} not found: ${matchErr?.message}`] };
  }
  if (match.status !== "finished") {
    return { processed: 0, errors: [`Match ${matchId} is not finished (status: ${match.status})`] };
  }
  if (match.home_score === null || match.away_score === null) {
    return { processed: 0, errors: [`Match ${matchId} has no score yet`] };
  }

  const actualHome    = match.home_score as number;
  const actualAway    = match.away_score as number;
  const actualOutcome = outcome(actualHome, actualAway);

  // Load all score predictions for this match
  const { data: predictions, error: predErr } = await (supabase as any)
    .from("score_predictions")
    .select("id, user_id, home_score, away_score")
    .eq("match_id", matchId);

  if (predErr) {
    return { processed: 0, errors: [`Failed to load predictions: ${predErr.message}`] };
  }
  if (!predictions?.length) {
    return { processed: 0, errors: [] };
  }

  // Load confirmed lineups (actual) for this match
  const { data: confirmedLineups } = await (supabase as any)
    .from("confirmed_lineups")
    .select("team_code, start_xi")
    .eq("match_id", matchId);

  // Build: teamCode → Set of "name|position" for starters
  const actualStartersByTeam: Record<string, Set<string>> = {};
  for (const cl of confirmedLineups ?? []) {
    actualStartersByTeam[cl.team_code] = new Set(
      (cl.start_xi ?? []).map((p: any) => `${p.name}|${p.position}`)
    );
  }

  // Load all lineup predictions for this match
  const { data: lineupPreds } = await (supabase as any)
    .from("lineup_predictions")
    .select("user_id, team_code, players")
    .eq("match_id", matchId);

  // Build: userId → lineup bonus points
  const lineupBonusByUser: Record<string, number> = {};
  for (const lp of lineupPreds ?? []) {
    const actualSet = actualStartersByTeam[lp.team_code];
    if (!actualSet) continue;
    let hits = 0;
    for (const p of (lp.players ?? []) as Array<{ name: string; position: string }>) {
      if (actualSet.has(`${p.name}|${p.position}`)) hits++;
    }
    // 0.5 pts per hit, max 5 pts per match (across both teams combined)
    lineupBonusByUser[lp.user_id] =
      (lineupBonusByUser[lp.user_id] ?? 0) + hits * 0.5;
  }
  // Cap total lineup bonus at 5 per match
  for (const uid of Object.keys(lineupBonusByUser)) {
    lineupBonusByUser[uid] = Math.min(5, lineupBonusByUser[uid]);
  }

  let processed = 0;

  for (const pred of predictions) {
    try {
      const predHome    = pred.home_score as number;
      const predAway    = pred.away_score as number;
      const predOutcome = outcome(predHome, predAway);

      const correctScore   = predHome === actualHome && predAway === actualAway;
      const correctOutcome = !correctScore && predOutcome === actualOutcome;

      const scorePoints   = correctScore ? 3 : correctOutcome ? 1 : 0;
      const lineupBonus   = Math.round((lineupBonusByUser[pred.user_id] ?? 0) * 2) / 2; // keep .5 precision
      const totalPoints   = scorePoints + lineupBonus;

      // Update score_prediction row
      const { error: updateErr } = await (supabase as any)
        .from("score_predictions")
        .update({
          points_awarded:  totalPoints,
          correct_score:   correctScore,
          correct_outcome: correctOutcome || correctScore,  // correct_outcome = true if score or outcome is correct
          match_stage:     match.stage,
        })
        .eq("id", pred.id);

      if (updateErr) {
        errors.push(`Update prediction ${pred.id}: ${updateErr.message}`);
        continue;
      }

      // Update profile total_points, correct_scores, correct_outcomes
      // Use increment pattern via RPC to avoid race conditions
      const { error: profileErr } = await (supabase as any).rpc("increment_player_points", {
        p_user_id:         pred.user_id,
        p_points:          totalPoints,
        p_correct_score:   correctScore   ? 1 : 0,
        p_correct_outcome: (correctScore || correctOutcome) ? 1 : 0,
      });

      if (profileErr) {
        errors.push(`Update profile ${pred.user_id}: ${profileErr.message}`);
      }

      processed++;
    } catch (err) {
      errors.push(`Pred ${pred.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { processed, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const log: string[] = [];
  const allErrors: string[] = [];
  let totalProcessed = 0;

  if (body.recalculate_all) {
    // Recalculate every finished match
    const { data: finishedMatches } = await (supabase as any)
      .from("matches")
      .select("id")
      .eq("status", "finished")
      .not("home_score", "is", null);

    for (const m of finishedMatches ?? []) {
      const { processed, errors } = await calculateForMatch(supabase, m.id);
      totalProcessed += processed;
      allErrors.push(...errors);
      log.push(`Match ${m.id}: ${processed} predictions processed`);
    }
  } else if (body.match_id) {
    const { processed, errors } = await calculateForMatch(supabase, body.match_id);
    totalProcessed = processed;
    allErrors.push(...errors);
    log.push(`Match ${body.match_id}: ${processed} predictions processed`);
  } else {
    return new Response(
      JSON.stringify({ error: "Provide match_id or recalculate_all: true" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      calculated_at: new Date().toISOString(),
      processed:     totalProcessed,
      errors:        allErrors.length ? allErrors : undefined,
      log,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
