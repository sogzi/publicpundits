/**
 * PublicPundits Prediction Engine
 *
 * Generates a scoreline prediction for any WC2026 match using:
 *   1. FIFA world ranking strength (hardcoded June 2026 approximation)
 *   2. Recent form — last 5 finished matches per team (football-data.org)
 *   3. Head-to-head record — last 5 H2H meetings (football-data.org)
 *   4. Tournament stage weight — knockouts trend lower-scoring
 *
 * Returns { homeScore, awayScore, confidence, reasoning } and upserts
 * the result to the platform_predictions table.
 */

import { createAdminClient } from "@/lib/supabase/admin";

const BASE_URL = "https://api.football-data.org/v4";

function fdHeaders() {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) throw new Error("FOOTBALL_API_KEY not set");
  return { "X-Auth-Token": key };
}

async function fdFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: fdHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

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
  // Normalise to 0–1 where rank 1 → 1.0, rank 52 → ~0.02
  return Math.max(0.02, (53 - rank) / 52);
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE WEIGHT  — knockouts tend to be tighter
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_MULTIPLIER: Record<string, number> = {
  group:        1.00,
  round_of_32:  0.90,
  round_of_16:  0.85,
  quarter_final: 0.80,
  semi_final:   0.78,
  third_place:  0.85,
  final:        0.75,
};

// ─────────────────────────────────────────────────────────────────────────────
// FORM  — fetch last 5 finished matches for a team
// ─────────────────────────────────────────────────────────────────────────────

interface FDMatchResult {
  homeTeam: { id: number; tla: string };
  awayTeam: { id: number; tla: string };
  score: { fullTime: { home: number | null; away: number | null } };
  status: string;
}

async function getRecentForm(teamFdId: number, teamTla: string): Promise<{
  pts: number; played: number; wins: number; draws: number; losses: number;
  goalsFor: number; goalsAgainst: number; label: string;
}> {
  try {
    const data = await fdFetch<{ matches: FDMatchResult[] }>(
      `/teams/${teamFdId}/matches?status=FINISHED&limit=5`
    );
    const matches = data.matches.slice(-5);

    let pts = 0, wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;

    for (const m of matches) {
      const isHome = m.homeTeam.tla === teamTla;
      const scored = isHome ? m.score.fullTime.home : m.score.fullTime.away;
      const conceded = isHome ? m.score.fullTime.away : m.score.fullTime.home;
      gf += scored ?? 0;
      ga += conceded ?? 0;
      const diff = (scored ?? 0) - (conceded ?? 0);
      if (diff > 0)      { wins++;   pts += 3; }
      else if (diff < 0) { losses++; }
      else               { draws++;  pts += 1; }
    }

    const played = matches.length;
    const wdl = `${wins}W ${draws}D ${losses}L`;
    const label = played > 0 ? `${wdl} in last ${played} (${gf} GF / ${ga} GA)` : "no recent data";
    return { pts, played, wins, draws, losses, goalsFor: gf, goalsAgainst: ga, label };
  } catch {
    return { pts: 7, played: 5, wins: 2, draws: 1, losses: 2, goalsFor: 6, goalsAgainst: 5, label: "form unavailable" };
  }
}

/** Form multiplier: 0.75 (terrible form) → 1.25 (perfect form) */
function formMultiplier(pts: number, played: number): number {
  if (played === 0) return 1.0;
  const maxPts = played * 3;
  const ratio = pts / maxPts; // 0–1
  return 0.75 + ratio * 0.50;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEAD-TO-HEAD  — last 5 meetings between the two teams
// ─────────────────────────────────────────────────────────────────────────────

async function getH2H(homeFdId: number, awayFdId: number, homeTla: string): Promise<{
  homeWins: number; awayWins: number; draws: number; played: number; label: string;
}> {
  try {
    const data = await fdFetch<{ matches: FDMatchResult[] }>(
      `/teams/${homeFdId}/matches?status=FINISHED&limit=20`
    );
    const h2h = data.matches.filter(
      (m) => m.homeTeam.id === awayFdId || m.awayTeam.id === awayFdId
    ).slice(-5);

    let homeWins = 0, awayWins = 0, draws = 0;
    for (const m of h2h) {
      const isHome = m.homeTeam.id === homeFdId;
      const scored = isHome ? m.score.fullTime.home : m.score.fullTime.away;
      const conceded = isHome ? m.score.fullTime.away : m.score.fullTime.home;
      const diff = (scored ?? 0) - (conceded ?? 0);
      if (diff > 0)      homeWins++;
      else if (diff < 0) awayWins++;
      else               draws++;
    }

    const played = h2h.length;
    const label = played > 0
      ? `H2H last ${played}: ${homeWins}W ${draws}D ${awayWins}L for ${homeTla}`
      : "no H2H data";
    return { homeWins, awayWins, draws, played, label };
  } catch {
    return { homeWins: 0, awayWins: 0, draws: 0, played: 0, label: "H2H unavailable" };
  }
}

/** H2H advantage multiplier for the home team: 0.9 → 1.1 */
function h2hMultiplier(homeWins: number, awayWins: number, played: number): number {
  if (played === 0) return 1.0;
  const advantage = (homeWins - awayWins) / played; // -1 to +1
  return 1.0 + advantage * 0.10;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORELINE  — convert expected goals to a realistic integer scoreline
// ─────────────────────────────────────────────────────────────────────────────

function toScoreline(xG: number): number {
  // Weighted rounding biased slightly toward lower scores (football is low-scoring)
  if (xG < 0.4)  return 0;
  if (xG < 0.9)  return Math.random() < 0.5 ? 0 : 1;
  if (xG < 1.4)  return 1;
  if (xG < 1.9)  return Math.random() < 0.5 ? 1 : 2;
  if (xG < 2.5)  return 2;
  if (xG < 3.2)  return Math.random() < 0.4 ? 2 : 3;
  return 3;
}

/** Confidence: higher when ranking gap is large, form is clear, H2H is one-sided */
function calcConfidence(
  homeStrength: number, awayStrength: number,
  homeForm: { pts: number; played: number },
  awayForm:  { pts: number; played: number },
  h2h: { homeWins: number; awayWins: number; played: number }
): number {
  let score = 50;

  // Ranking gap — bigger gap → more confident
  const gap = Math.abs(homeStrength - awayStrength);
  score += gap * 30; // up to +30

  // Form clarity
  const homeFormRatio = homeForm.played > 0 ? homeForm.pts / (homeForm.played * 3) : 0.5;
  const awayFormRatio = awayForm.played > 0  ? awayForm.pts  / (awayForm.played  * 3) : 0.5;
  const formDiff = Math.abs(homeFormRatio - awayFormRatio);
  score += formDiff * 20; // up to +20

  // H2H clarity
  if (h2h.played >= 3) {
    const dominance = Math.abs(h2h.homeWins - h2h.awayWins) / h2h.played;
    score += dominance * 10; // up to +10
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

export async function generatePrediction(matchId: string): Promise<PredictionResult> {
  const admin = createAdminClient();

  // ── 1. Load match + team FD ids from Supabase ──────────────────────────────
  const { data: match, error: matchErr } = await admin
    .from("matches")
    .select("id, home_team, away_team, home_team_code, away_team_code, stage, kickoff_at")
    .eq("id", matchId)
    .single();

  if (matchErr || !match) throw new Error(`Match ${matchId} not found`);

  const { data: homeSquad } = await admin
    .from("squads")
    .select("team_fd_id")
    .eq("team_code", match.home_team_code)
    .maybeSingle();

  const { data: awaySquad } = await admin
    .from("squads")
    .select("team_fd_id")
    .eq("team_code", match.away_team_code)
    .maybeSingle();

  // ── 2. Ranking strength ────────────────────────────────────────────────────
  const homeStrength = rankStrength(match.home_team_code);
  const awayStrength = rankStrength(match.away_team_code);
  const homeRank = FIFA_RANKINGS[match.home_team_code] ?? 40;
  const awayRank = FIFA_RANKINGS[match.away_team_code] ?? 40;

  // ── 3. Form (parallel fetch) ───────────────────────────────────────────────
  const [homeForm, awayForm] = await Promise.all([
    homeSquad?.team_fd_id
      ? getRecentForm(homeSquad.team_fd_id, match.home_team_code)
      : Promise.resolve({ pts: 7, played: 5, wins: 2, draws: 1, losses: 2, goalsFor: 5, goalsAgainst: 4, label: "unavailable" }),
    awaySquad?.team_fd_id
      ? getRecentForm(awaySquad.team_fd_id, match.away_team_code)
      : Promise.resolve({ pts: 7, played: 5, wins: 2, draws: 1, losses: 2, goalsFor: 5, goalsAgainst: 4, label: "unavailable" }),
  ]);

  // ── 4. H2H (only if we have both FD ids) ──────────────────────────────────
  const h2h = homeSquad?.team_fd_id && awaySquad?.team_fd_id
    ? await getH2H(homeSquad.team_fd_id, awaySquad.team_fd_id, match.home_team_code)
    : { homeWins: 0, awayWins: 0, draws: 0, played: 0, label: "H2H unavailable" };

  // ── 5. Stage weight ────────────────────────────────────────────────────────
  const stageMult = STAGE_MULTIPLIER[match.stage] ?? 1.0;
  const stageLabel = match.stage.replace(/_/g, " ");

  // ── 6. Expected goals ──────────────────────────────────────────────────────
  // Base: ranking strength maps to ~0.5–2.0 goals per game
  const baseHome = 0.5 + homeStrength * 1.5;
  const baseAway = 0.5 + awayStrength * 1.5;

  const homeXG = baseHome
    * formMultiplier(homeForm.pts, homeForm.played)
    * h2hMultiplier(h2h.homeWins, h2h.awayWins, h2h.played)
    * stageMult;

  const awayXG = baseAway
    * formMultiplier(awayForm.pts, awayForm.played)
    * h2hMultiplier(h2h.awayWins, h2h.homeWins, h2h.played) // reversed perspective
    * stageMult;

  // ── 7. Scoreline ───────────────────────────────────────────────────────────
  const homeScore = toScoreline(homeXG);
  const awayScore = toScoreline(awayXG);

  // ── 8. Confidence ──────────────────────────────────────────────────────────
  const confidence = calcConfidence(homeStrength, awayStrength, homeForm, awayForm, h2h);

  // ── 9. Reasoning ───────────────────────────────────────────────────────────
  const rankingSentence = homeRank < awayRank
    ? `${match.home_team} (ranked #${homeRank}) hold a ranking advantage over ${match.away_team} (ranked #${awayRank}).`
    : homeRank > awayRank
    ? `${match.away_team} (ranked #${awayRank}) are the higher-ranked side against ${match.home_team} (ranked #${homeRank}).`
    : `Both teams are evenly ranked (#${homeRank}).`;

  const formSentence = `Recent form — ${match.home_team}: ${homeForm.label}; ${match.away_team}: ${awayForm.label}.`;

  const h2hSentence = h2h.played > 0
    ? `Head-to-head (last ${h2h.played}): ${h2h.label}.`
    : "No recent head-to-head data available.";

  const stageSentence = match.stage !== "group"
    ? `This is a ${stageLabel} fixture — knockout matches tend to be tighter and lower-scoring (factor ×${stageMult}).`
    : `Group stage match — both teams likely to push for goals.`;

  const xgSentence = `Projected xG: ${match.home_team} ${homeXG.toFixed(2)} – ${awayXG.toFixed(2)} ${match.away_team}.`;

  const reasoning = [rankingSentence, formSentence, h2hSentence, stageSentence, xgSentence].join(" ");

  // ── 10. Persist to Supabase ────────────────────────────────────────────────
  const { error: upsertErr } = await admin
    .from("platform_predictions")
    .upsert(
      { match_id: matchId, home_score: homeScore, away_score: awayScore, confidence, reasoning, generated_at: new Date().toISOString() },
      { onConflict: "match_id" }
    );

  if (upsertErr) throw upsertErr;

  return { homeScore, awayScore, confidence, reasoning };
}
