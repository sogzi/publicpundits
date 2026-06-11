/**
 * football-data.org v4 client
 * Docs: https://www.football-data.org/documentation/quickstart
 *
 * Free tier: 10 req/min, access to WC2026
 * Competition code: WC = FIFA World Cup
 */

const BASE_URL = "https://api.football-data.org/v4";

function headers() {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) throw new Error("FOOTBALL_API_KEY is not set");
  return { "X-Auth-Token": key };
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`football-data.org ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────
// TYPES  (football-data.org v4 shapes)
// ─────────────────────────────────────────────

export interface FDTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;       // 3-letter code e.g. "MEX"
  crest: string;
}

export interface FDMatch {
  id: number;
  utcDate: string;   // ISO-8601 UTC
  status: string;    // "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "SCHEDULED" | "POSTPONED"
  matchday: number;
  stage: string;     // "GROUP_STAGE" | "LAST_32" | "LAST_16" | "QUARTER_FINALS" | "SEMI_FINALS" | "THIRD_PLACE" | "FINAL"
  group: string | null; // "GROUP_A" … "GROUP_L" | null
  homeTeam: FDTeam;
  awayTeam: FDTeam;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  referees: Array<{ id: number; name: string; type: string; nationality: string }>;
}

export interface FDLineup {
  id: number;
  formation: string;
  startXI: Array<{
    player: { id: number; name: string; position: string; shirtNumber: number };
  }>;
  substitutes: Array<{
    player: { id: number; name: string; position: string; shirtNumber: number };
  }>;
  coach: { id: number; name: string };
  homeTeam?: FDTeam;
  awayTeam?: FDTeam;
}

// ─────────────────────────────────────────────
// PUBLIC FUNCTIONS
// ─────────────────────────────────────────────

/** All 104 FIFA World Cup 2026 fixtures */
export async function getFixtures(): Promise<FDMatch[]> {
  const data = await apiFetch<{ matches: FDMatch[] }>("/competitions/WC/matches");
  return data.matches;
}

/** Live / in-progress WC2026 matches */
export async function getLiveScores(): Promise<FDMatch[]> {
  const data = await apiFetch<{ matches: FDMatch[] }>(
    "/competitions/WC/matches?status=IN_PLAY,PAUSED"
  );
  return data.matches;
}

/** Lineups for a specific match (available ~1h before kickoff) */
export async function getLineups(matchId: number): Promise<{ homeTeam: FDLineup; awayTeam: FDLineup } | null> {
  try {
    const data = await apiFetch<{ homeTeam: FDLineup; awayTeam: FDLineup }>(
      `/matches/${matchId}/lineups`
    );
    return data;
  } catch {
    return null;
  }
}

/** Player stats for a finished match */
export async function getPlayerStats(matchId: number) {
  return apiFetch(`/matches/${matchId}`);
}

// ─────────────────────────────────────────────
// MAPPING HELPERS
// ─────────────────────────────────────────────

/** football-data.org stage → our DB stage enum */
export function mapStage(stage: string): string {
  switch (stage) {
    case "GROUP_STAGE":   return "group";
    case "LAST_32":       return "round_of_32";
    case "LAST_16":       return "round_of_16";
    case "QUARTER_FINALS": return "quarter_final";
    case "SEMI_FINALS":   return "semi_final";
    case "THIRD_PLACE":   return "third_place";
    case "FINAL":         return "final";
    default:              return "group";
  }
}

/** football-data.org status → our DB status */
export function mapStatus(status: string): "upcoming" | "live" | "finished" {
  if (["IN_PLAY", "PAUSED", "HALFTIME"].includes(status)) return "live";
  if (["FINISHED", "AWARDED"].includes(status))            return "finished";
  return "upcoming"; // TIMED, SCHEDULED, POSTPONED, etc.
}

/** "GROUP_A" → "A", null → null */
export function mapGroup(group: string | null): string | null {
  if (!group) return null;
  const m = group.match(/GROUP_([A-Z]+)/);
  return m ? m[1] : null;
}

/** Lock simultaneous matchday-3 games 15 min before kickoff */
export function lockTime(kickoffIso: string): string {
  return new Date(new Date(kickoffIso).getTime() - 15 * 60 * 1000).toISOString();
}
