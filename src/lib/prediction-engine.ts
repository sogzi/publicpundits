/**
 * PublicPundits Prediction Engine
 *
 * Generates a scoreline prediction for any WC2026 match using:
 *   1. FIFA world ranking strength (hardcoded June 2026 approximation)
 *   2. Recent form — derived from livescore-api H2H response overall_form arrays
 *   3. Head-to-head record — from livescore-api /teams/head2head.json
 *   4. Tournament stage weight — knockouts trend lower-scoring
 *
 * Returns { homeScore, awayScore, confidence, reasoning } and upserts
 * the result to the platform_predictions table.
 *
 * Data source: livescore-api.com (WC2026 competition_id = 362)
 * Team livescore IDs are stored in squads.team_fd_id (repurposed column).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getH2H } from "@/lib/football-api";

// ─────────────────────────────────────────────────────────────────────────────
// FIFA RANKING LOOKUP  (approximate June 2026 rankings, WC2026 participants)
// Lower number = stronger team. Non-listed teams default to rank 40.
// ─────────────────────────────────────────────────────────────────────────────

const FIFA_RANKINGS: Record<string, number> = {
  ARG: 1,  FRA: 2,  ESP: 3,  ENG: 4,  BRA: 5,
  POR: 6,  BEL: 7,  NED: 8,  GER: 9,  URY: 10,
  COL: 11, ITA: 12, USA: 13, MEX: 14, CRO: 15,
  SUI: 16, MAR: 17, SEN: 18, JPN: 19, KOR: 20,
  DEN: 21, AUT: 22, TUR: 23, ECU: 24, CAN: 25,
  AUS: 26, POL: 27, UKR: 28, IRN: 29, SWE: 30,
  NOR: 31, SCO: 32, SRB: 33, CZE: 34, GHA: 35,
  TUN: 36, CIV: 37, EGY: 38, RSA: 39, NZL: 40,
  IRQ: 41, JOR: 42, QAT: 43, KSA: 44, UZB: 45,
  CPV: 46, COD: 47, BIH: 48, PAR: 49, PAN: 50,
  HAI: 51, CUW: 52, ALG: 36,
};

function rankStrength(tla: string): number {
  const rank = FIFA_RANKINGS[tla] ?? 40;
  return Math.max(0.02, (53 - rank) / 52);
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE WEIGHT
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_MULTIPLIER: Record<string, number> = {
  group:         1.00,
  round_of_32:   0.90,
  round_of_16:   0.85,
  quarter_final: 0.80,
  semi_final:    0.78,
  third_place:   0.85,
  final:         0.75,
};

// ─────────────────────────────────────────────────────────────────────────────
// FORM  — parse livescore "W"/"D"/"L" strings from H2H overall_form arrays
// ─────────────────────────────────────────────────────────────────────────────

interface FormStats {
  pts: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  label: string;
}

function parseFormArray(form: string[]): FormStats {
  let pts = 0, wins = 0, draws = 0, losses = 0;
  for (const r of form) {
    if (r === "W")      { wins++;   pts += 3; }
    else if (r === "D") { draws++;  pts += 1; }
    else if (r === "L") { losses++; }
  }
  const played = form.length;
  const label  = played > 0
    ? `${wins}W ${draws}D ${losses}L in last ${played}`
    : "no recent data";
  return { pts, played, wins, draws, losses, label };
}

const defaultForm: FormStats = {
  pts: 7, played: 5, wins: 2, draws: 1, losses: 2,
  label: "form unavailable",
};

function formMultiplier(pts: number, played: number): number {
  if (played === 0) return 1.0;
  const maxPts = played * 3;
  const ratio = pts / maxPts;
  return 0.75 + ratio * 0.50;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEAD-TO-HEAD  — parse livescore h2h_form arrays
// ─────────────────────────────────────────────────────────────────────────────

interface H2HStats {
  homeWins: number;
  awayWins: number;
  draws: number;
  played: number;
  label: string;
}

function parseH2HForm(homeForm: string[], awayForm: string[], homeName: string): H2HStats {
  // homeForm[i] is the result from the home team's perspective for meeting i
  let homeWins = 0, awayWins = 0, draws = 0;
  const played = Math.max(homeForm.length, awayForm.length);

  // Use home team's h2h_form: W = home won, L = away won, D = draw
  for (const r of homeForm) {
    if (r === "W")      homeWins++;
    else if (r === "L") awayWins++;
    else if (r === "D") draws++;
  }

  const label = played > 0
    ? `H2H last ${played}: ${homeWins}W ${draws}D ${awayWins}L for ${homeName}`
    : "no H2H data";
  return { homeWins, awayWins, draws, played, label };
}

function h2hMultiplier(homeWins: number, awayWins: number, played: number): number {
  if (played === 0) return 1.0;
  const advantage = (homeWins - awayWins) / played;
  return 1.0 + advantage * 0.10;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORELINE
// ─────────────────────────────────────────────────────────────────────────────

function toScoreline(xG: number): number {
  if (xG < 0.4)  return 0;
  if (xG < 0.9)  return Math.random() < 0.5 ? 0 : 1;
  if (xG < 1.4)  return 1;
  if (xG < 1.9)  return Math.random() < 0.5 ? 1 : 2;
  if (xG < 2.5)  return 2;
  if (xG < 3.2)  return Math.random() < 0.4 ? 2 : 3;
  return 3;
}

function calcConfidence(
  homeStrength: number, awayStrength: number,
  homeForm: FormStats, awayForm: FormStats,
  h2h: H2HStats
): number {
  let score = 50;
  const gap = Math.abs(homeStrength - awayStrength);
  score += gap * 30;
  const homeFormRatio = homeForm.played > 0 ? homeForm.pts / (homeForm.played * 3) : 0.5;
  const awayFormRatio = awayForm.played  > 0 ? awayForm.pts  / (awayForm.played  * 3) : 0.5;
  score += Math.abs(homeFormRatio - awayFormRatio) * 20;
  if (h2h.played >= 3) {
    score += (Math.abs(h2h.homeWins - h2h.awayWins) / h2h.played) * 10;
  }
  return Math.round(Math.min(92, Math.max(35, score)));
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export interface PredictionResult {
  homeScore:  number;
  awayScore:  number;
  confidence: number;
  reasoning:  string;
}

export interface GenerateOptions {
  /**
   * fastMode: skip external API calls (form + H2H).
   * Uses only FIFA rankings + stage weight.
   */
  fastMode?: boolean;
}

export async function generatePrediction(matchId: string, opts: GenerateOptions = {}): Promise<PredictionResult> {
  const admin = createAdminClient();

  // ── 1. Load match from Supabase ────────────────────────────────────────────
  const { data: match, error: matchErr } = await (admin as any)
    .from("matches")
    .select("id, home_team, away_team, home_team_code, away_team_code, stage, kickoff_at")
    .eq("id", matchId)
    .single();

  if (matchErr || !match) throw new Error(`Match ${matchId} not found`);

  // ── 2. Look up livescore team IDs from squads table ───────────────────────
  // team_fd_id column is repurposed to store livescore team IDs after migration
  const { data: homeSquad } = await (admin as any)
    .from("squads")
    .select("team_fd_id")
    .eq("team_code", match.home_team_code)
    .maybeSingle();

  const { data: awaySquad } = await (admin as any)
    .from("squads")
    .select("team_fd_id")
    .eq("team_code", match.away_team_code)
    .maybeSingle();

  // ── 3. Ranking strength ────────────────────────────────────────────────────
  const homeStrength = rankStrength(match.home_team_code);
  const awayStrength = rankStrength(match.away_team_code);
  const homeRank = FIFA_RANKINGS[match.home_team_code] ?? 40;
  const awayRank = FIFA_RANKINGS[match.away_team_code] ?? 40;

  // ── 4. Form + H2H via livescore-api ──────────────────────────────────────
  let homeForm: FormStats = defaultForm;
  let awayForm: FormStats = defaultForm;
  let h2h: H2HStats = { homeWins: 0, awayWins: 0, draws: 0, played: 0, label: "H2H unavailable" };

  if (!opts.fastMode && homeSquad?.team_fd_id && awaySquad?.team_fd_id) {
    try {
      const h2hData = await getH2H(homeSquad.team_fd_id, awaySquad.team_fd_id);
      if (h2hData) {
        homeForm = parseFormArray(h2hData.team1.overall_form ?? []);
        awayForm = parseFormArray(h2hData.team2.overall_form ?? []);
        h2h = parseH2HForm(
          h2hData.team1.h2h_form ?? [],
          h2hData.team2.h2h_form ?? [],
          match.home_team
        );
      }
    } catch {
      // Silently fall back to defaults — prediction still runs
    }
  }

  // ── 5. Stage weight ────────────────────────────────────────────────────────
  const stageMult  = STAGE_MULTIPLIER[match.stage] ?? 1.0;
  const stageLabel = match.stage.replace(/_/g, " ");

  // ── 6. Expected goals ──────────────────────────────────────────────────────
  const baseHome = 0.5 + homeStrength * 1.5;
  const baseAway = 0.5 + awayStrength * 1.5;

  const homeXG = baseHome
    * formMultiplier(homeForm.pts, homeForm.played)
    * h2hMultiplier(h2h.homeWins, h2h.awayWins, h2h.played)
    * stageMult;

  const awayXG = baseAway
    * formMultiplier(awayForm.pts, awayForm.played)
    * h2hMultiplier(h2h.awayWins, h2h.homeWins, h2h.played)
    * stageMult;

  // ── 7. Scoreline & confidence ──────────────────────────────────────────────
  const homeScore = toScoreline(homeXG);
  const awayScore = toScoreline(awayXG);
  const confidence = calcConfidence(homeStrength, awayStrength, homeForm, awayForm, h2h);

  // ── 8. Reasoning ───────────────────────────────────────────────────────────
  const rankingSentence = homeRank < awayRank
    ? `${match.home_team} (ranked #${homeRank}) hold a ranking advantage over ${match.away_team} (ranked #${awayRank}).`
    : homeRank > awayRank
    ? `${match.away_team} (ranked #${awayRank}) are the higher-ranked side against ${match.home_team} (ranked #${homeRank}).`
    : `Both teams are evenly ranked (#${homeRank}).`;

  const formSentence = opts.fastMode
    ? `Prediction based on FIFA rankings and stage weighting (form data not fetched).`
    : `Recent form — ${match.home_team}: ${homeForm.label}; ${match.away_team}: ${awayForm.label}.`;

  const h2hSentence = h2h.played > 0
    ? `Head-to-head (last ${h2h.played}): ${h2h.label}.`
    : "No recent head-to-head data available.";

  const stageSentence = match.stage !== "group"
    ? `This is a ${stageLabel} fixture — knockout matches tend to be tighter and lower-scoring (factor ×${stageMult}).`
    : `Group stage match — both teams likely to push for goals.`;

  const xgSentence = `Projected xG: ${match.home_team} ${homeXG.toFixed(2)} – ${awayXG.toFixed(2)} ${match.away_team}.`;

  const reasoning = [rankingSentence, formSentence, h2hSentence, stageSentence, xgSentence].join(" ");

  // ── 9. Persist to Supabase ────────────────────────────────────────────────
  const { error: upsertErr } = await (admin as any)
    .from("platform_predictions")
    .upsert(
      { match_id: matchId, home_score: homeScore, away_score: awayScore, confidence, reasoning, generated_at: new Date().toISOString() },
      { onConflict: "match_id" }
    );

  if (upsertErr) throw upsertErr;

  return { homeScore, awayScore, confidence, reasoning };
}
