/**
 * API-Football v3 client (RapidAPI)
 * Docs: https://www.api-football.com/documentation-v3
 *
 * League 1 = FIFA World Cup (all seasons)
 * Season 2026 = FIFA World Cup 2026
 */

const BASE_URL = "https://api-football-v1.p.rapidapi.com/v3";
const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;

function headers() {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) throw new Error("FOOTBALL_API_KEY is not set in environment variables");
  return {
    "X-RapidAPI-Key": key,
    "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
    "Content-Type": "application/json",
  };
}

async function apiFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`API-Football error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football errors: ${JSON.stringify(json.errors)}`);
  }
  return json.response as T;
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ApiFixture {
  fixture: {
    id: number;
    date: string;       // ISO-8601 UTC
    venue: { id: number | null; name: string | null; city: string | null };
    status: { long: string; short: string; elapsed: number | null };
  };
  league: {
    id: number;
    name: string;
    season: number;
    round: string;  // "Group Stage - 1", "Round of 16", "Quarter-finals", etc.
    group: string | null; // "Group A", "Group B", etc.
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

export interface ApiLineup {
  team: { id: number; name: string; logo: string };
  coach: { id: number; name: string; photo: string };
  formation: string;
  startXI: Array<{
    player: { id: number; name: string; number: number; pos: string; grid: string | null };
  }>;
  substitutes: Array<{
    player: { id: number; name: string; number: number; pos: string; grid: string | null };
  }>;
}

export interface ApiPlayerStat {
  team: { id: number; name: string; logo: string };
  players: Array<{
    player: { id: number; name: string; photo: string };
    statistics: Array<{
      games: {
        minutes: number | null;
        number: number;
        position: string;
        rating: string | null;
        captain: boolean;
        substitute: boolean;
      };
      goals: { total: number | null; conceded: number | null; assists: number | null; saves: number | null };
      shots: { total: number | null; on: number | null };
      passes: { total: number | null; key: number | null; accuracy: string | null };
      tackles: { total: number | null; blocks: number | null; interceptions: number | null };
      dribbles: { attempts: number | null; success: number | null };
      cards: { yellow: number; red: number };
    }>;
  }>;
}

// ─────────────────────────────────────────────
// PUBLIC FUNCTIONS
// ─────────────────────────────────────────────

/** Fetch all FIFA World Cup 2026 fixtures */
export async function getFixtures(): Promise<ApiFixture[]> {
  return apiFetch<ApiFixture[]>("/fixtures", {
    league: WC_LEAGUE_ID,
    season: WC_SEASON,
  });
}

/** Fetch live scores (all in-progress WC2026 matches) */
export async function getLiveScores(): Promise<ApiFixture[]> {
  return apiFetch<ApiFixture[]>("/fixtures", {
    live: "all",
    league: WC_LEAGUE_ID,
    season: WC_SEASON,
  });
}

/** Fetch confirmed lineups for a specific fixture */
export async function getLineups(apiFixtureId: number): Promise<ApiLineup[]> {
  return apiFetch<ApiLineup[]>("/fixtures/lineups", { fixture: apiFixtureId });
}

/** Fetch player statistics for a specific fixture */
export async function getPlayerStats(apiFixtureId: number): Promise<ApiPlayerStat[]> {
  return apiFetch<ApiPlayerStat[]>("/fixtures/players", { fixture: apiFixtureId });
}

// ─────────────────────────────────────────────
// MAPPING HELPERS
// ─────────────────────────────────────────────

/** Map API round string → our DB stage enum */
export function mapStage(round: string): string {
  const r = round.toLowerCase();
  if (r.includes("group"))           return "group";
  if (r.includes("round of 32"))     return "round_of_32";
  if (r.includes("round of 16"))     return "round_of_16";
  if (r.includes("quarter"))         return "quarter_final";
  if (r.includes("semi"))            return "semi_final";
  if (r.includes("3rd") || r.includes("third") || r.includes("place")) return "third_place";
  if (r.includes("final"))           return "final";
  return "group";
}

/** Map API status.short → our DB status enum */
export function mapStatus(short: string): "upcoming" | "live" | "finished" {
  if (["1H", "HT", "2H", "ET", "BT", "P", "INT"].includes(short)) return "live";
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  return "upcoming";
}

/** Extract group letter from league.group string e.g. "Group A" → "A" */
export function mapGroup(group: string | null): string | null {
  if (!group) return null;
  const match = group.match(/Group\s+([A-Z])/i);
  return match ? match[1].toUpperCase() : null;
}

/** Best-effort FIFA 3-letter code from team name */
export function teamCode(name: string): string {
  const overrides: Record<string, string> = {
    "United States":         "USA",
    "USA":                   "USA",
    "South Korea":           "KOR",
    "Korea Republic":        "KOR",
    "IR Iran":               "IRN",
    "Iran":                  "IRN",
    "Saudi Arabia":          "KSA",
    "Ivory Coast":           "CIV",
    "Cote d'Ivoire":         "CIV",
    "Netherlands":           "NED",
    "England":               "ENG",
    "Scotland":              "SCO",
    "Wales":                 "WAL",
    "Northern Ireland":      "NIR",
    "Czech Republic":        "CZE",
    "Czechia":               "CZE",
    "Bosnia":                "BIH",
    "Bosnia and Herzegovina":"BIH",
    "North Macedonia":       "MKD",
    "New Zealand":           "NZL",
    "Costa Rica":            "CRC",
    "Trinidad and Tobago":   "TTO",
    "Trinidad & Tobago":     "TTO",
    "Dominican Republic":    "DOM",
    "Cape Verde":            "CPV",
    "DR Congo":              "COD",
    "Burkina Faso":          "BFA",
    "Sierra Leone":          "SLE",
    "Equatorial Guinea":     "GEQ",
    "Central African Republic": "CAF",
    "South Africa":          "RSA",
    "Tanzania":              "TAN",
    "Zimbabwe":              "ZIM",
    "Zambia":                "ZAM",
    "New Caledonia":         "NCL",
    "Papua New Guinea":      "PNG",
  };
  if (overrides[name]) return overrides[name];
  // Fallback: first 3 chars uppercased
  return name.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();
}

/** 15-min lock before kickoff */
export function lockTime(kickoffIso: string): string {
  return new Date(new Date(kickoffIso).getTime() - 15 * 60 * 1000).toISOString();
}
