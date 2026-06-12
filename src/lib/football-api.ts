/**
 * livescore-api.com client
 * https://livescore-api.com/
 *
 * Auth: ?key=KEY&secret=SECRET query params
 * WC2026 competition_id = 362
 * Internal match `id` (NOT fixture_id) used for events/lineups/stats
 */

const BASE_URL = "https://livescore-api.com/api-client";

function auth() {
  const key    = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) throw new Error("LIVESCORE_API_KEY / LIVESCORE_API_SECRET not set");
  return `key=${key}&secret=${secret}`;
}

async function lsFetch<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE_URL}${path}${sep}${auth()}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`livescore-api ${res.status} ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Team name → 3-letter code  (livescore names differ slightly from FD names)
// ─────────────────────────────────────────────────────────────────────────────
export const LIVESCORE_NAME_TO_TLA: Record<string, string> = {
  "Algeria":                "ALG",
  "Argentina":              "ARG",
  "Australia":              "AUS",
  "Austria":                "AUT",
  "Belgium":                "BEL",
  "Bosnia and Herzegovina": "BIH",
  "Brazil":                 "BRA",
  "Canada":                 "CAN",
  "Cape Verde":             "CPV",
  "Colombia":               "COL",
  "Croatia":                "CRO",
  "Curacao":                "CUW",
  "Czech Republic":         "CZE",
  "DR Congo":               "COD",
  "Ecuador":                "ECU",
  "Egypt":                  "EGY",
  "England":                "ENG",
  "France":                 "FRA",
  "Germany":                "GER",
  "Ghana":                  "GHA",
  "Haiti":                  "HAI",
  "Iran":                   "IRN",
  "Iraq":                   "IRQ",
  "Ivory Coast":            "CIV",
  "Japan":                  "JPN",
  "Jordan":                 "JOR",
  "Mexico":                 "MEX",
  "Morocco":                "MAR",
  "Netherlands":            "NED",
  "New Zealand":            "NZL",
  "Norway":                 "NOR",
  "Panama":                 "PAN",
  "Paraguay":               "PAR",
  "Portugal":               "POR",
  "Qatar":                  "QAT",
  "Saudi Arabia":           "KSA",
  "Scotland":               "SCO",
  "Senegal":                "SEN",
  "Serbia":                 "SRB",
  "South Africa":           "RSA",
  "South Korea":            "KOR",
  "Spain":                  "ESP",
  "Sweden":                 "SWE",
  "Switzerland":            "SUI",
  "Tunisia":                "TUN",
  "Turkey":                 "TUR",
  "USA":                    "USA",
  "Uruguay":                "URY",
  "Uzbekistan":             "UZB",
};

/** livescore team name → TLA (falls back to first 3 chars uppercased) */
export function nameToTla(name: string): string {
  return LIVESCORE_NAME_TO_TLA[name] ?? name.substring(0, 3).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LSTeam {
  id:          string | number;
  name:        string;
  logo?:       string;
  country_id?: number;
  stadium?:    string;
}

export interface LSMatch {
  id:          number;
  fixture_id?: number;
  date:        string;          // "2026-06-11"
  scheduled?:  string;          // "19:05"
  time?:       string;          // "19:00:00" | "FT" | "89"
  status?:     string;          // "FINISHED" | "LIVE"
  home:        LSTeam;
  away:        LSTeam;
  round?:      string;
  group_id?:   number;
  scores?: {
    score:    string;
    ht_score: string;
    ft_score: string;
    et_score: string;
    ps_score: string;
  };
  competition?: { id: number; name: string };
}

export interface LSLineupPlayer {
  id:           string;
  name:         string;
  substitution: string;   // "0" = starter, "1" = sub
  shirt_number: string;
  position:     string;   // "GK" | "DF" | "MF" | "FW"
  photo?:       string;
}

export interface LSLineup {
  home: { team: LSTeam; players: LSLineupPlayer[] };
  away: { team: LSTeam; players: LSLineupPlayer[] };
}

export interface LSEvent {
  id:        string;
  match_id:  string;
  player:    string;
  time:      string;
  event:     string;   // "GOAL"|"OWN GOAL"|"PENALTY GOAL"|"YELLOW CARD"|"RED CARD"|"SUBSTITUTION"
  home_away: string;   // "h" | "a"
  info?:     string;   // assist (GOAL) or player coming on (SUBSTITUTION)
}

export interface LSStats {
  possesion?:        string;  // "61:39"
  shots_on_target?:  string;
  shots_off_target?: string;
  shots_blocked?:    string;
  corners?:          string;
  offsides?:         string;
  yellow_cards?:     string;
  red_cards?:        string;
  saves?:            string;
  fauls?:            string;
  attempts_on_goal?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API functions
// ─────────────────────────────────────────────────────────────────────────────

const WC = 362;

/** All upcoming WC2026 fixtures */
export async function getFixtures(): Promise<LSMatch[]> {
  const data = await lsFetch<{ success: boolean; data: { fixtures: LSMatch[] } }>(
    `/fixtures/list.json?competition_id=${WC}`
  );
  return data.data?.fixtures ?? [];
}

/** All finished WC2026 matches */
export async function getMatchHistory(): Promise<LSMatch[]> {
  const data = await lsFetch<{ success: boolean; data: { match: LSMatch[] } }>(
    `/matches/history.json?competition_id=${WC}`
  );
  return data.data?.match ?? [];
}

/** Currently live WC2026 matches */
export async function getLiveScores(): Promise<LSMatch[]> {
  const data = await lsFetch<{ success: boolean; data: { match: LSMatch[] } }>(
    `/matches/live.json?competition_id=${WC}`
  );
  return data.data?.match ?? [];
}

/**
 * Lineups for a match by livescore internal ID.
 * Returns null if not yet published.
 */
export async function getLineups(matchId: number): Promise<LSLineup | null> {
  try {
    const data = await lsFetch<{ success: boolean; data: { lineup: LSLineup } }>(
      `/matches/lineups.json?match_id=${matchId}`
    );
    if (!data.success || !data.data?.lineup) return null;
    return data.data.lineup;
  } catch {
    return null;
  }
}

/** Match events (goals, cards, subs) by livescore internal ID */
export async function getMatchEvents(matchId: number): Promise<LSEvent[]> {
  try {
    const data = await lsFetch<{ success: boolean; data: { event: LSEvent[] } }>(
      `/scores/events.json?id=${matchId}`
    );
    return data.data?.event ?? [];
  } catch {
    return [];
  }
}

/** Match statistics by livescore internal ID */
export async function getMatchStats(matchId: number): Promise<LSStats | null> {
  try {
    const data = await lsFetch<{ success: boolean; data: LSStats }>(
      `/matches/stats.json?match_id=${matchId}`
    );
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

/** WC2026 squad for a team by livescore team ID */
export async function getSquadForTeam(teamId: number): Promise<
  Array<{ id: string; name: string; shirt_number: string; position: string }> | null
> {
  try {
    const data = await lsFetch<{
      success: boolean;
      data: Array<{ id: string; name: string; shirt_number: string; position: string }>;
    }>(`/competitions/squads.json?competition_id=${WC}&team_id=${teamId}`);
    return data.success ? (data.data ?? []) : null;
  } catch {
    return null;
  }
}

/** H2H between two teams by livescore team IDs */
export async function getH2H(team1Id: number, team2Id: number): Promise<{
  team1: { overall_form: string[]; h2h_form: string[] };
  team2: { overall_form: string[]; h2h_form: string[] };
} | null> {
  try {
    const data = await lsFetch<{ success: boolean; data: any }>(
      `/teams/head2head.json?team1_id=${team1Id}&team2_id=${team2Id}`
    );
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

/** livescore match → DB status */
export function mapStatus(match: LSMatch): "upcoming" | "live" | "finished" {
  const status = (match.status ?? "").toUpperCase();
  const time   = match.time ?? "";
  if (status === "FINISHED" || ["FT", "AET", "PEN"].includes(time)) return "finished";
  if (status === "LIVE"     || time === "HT" || /^\d+(\+\d+)?$/.test(time)) return "live";
  return "upcoming";
}

/** Parse "2 - 0" score string → { home, away } */
export function parseScore(score: string | null | undefined): { home: number | null; away: number | null } {
  if (!score || !score.includes(" - ")) return { home: null, away: null };
  const [h, a] = score.split(" - ");
  const home = parseInt(h);
  const away = parseInt(a);
  return { home: isNaN(home) ? null : home, away: isNaN(away) ? null : away };
}

/** Build ISO kickoff from livescore date + time/scheduled fields */
export function kickoffIso(match: LSMatch): string {
  const date = match.date;
  const raw  = match.scheduled ?? (match.time && match.time.includes(":") ? match.time : null) ?? "00:00";
  const t    = raw.length === 5 ? `${raw}:00` : raw.substring(0, 8);
  return `${date}T${t}Z`;
}

/** livescore round/group → DB stage */
export function mapStage(match: LSMatch): string {
  const r = (match.round ?? "").toUpperCase();
  if (["R32", "ROUND OF 32"].includes(r)) return "round_of_32";
  if (["R16", "ROUND OF 16"].includes(r)) return "round_of_16";
  if (["QF",  "QUARTER FINAL", "QUARTER-FINAL"].includes(r)) return "quarter_final";
  if (["SF",  "SEMI FINAL",    "SEMI-FINAL"].includes(r))    return "semi_final";
  if (["3RD", "THIRD PLACE"].includes(r))                    return "third_place";
  if (["F",   "FINAL"].includes(r))                          return "final";
  return "group"; // numeric rounds 1/2/3 = group stage
}

/** livescore group_id (4286–4297) → "A"–"L" */
export function mapGroup(groupId: number | null | undefined): string | null {
  if (!groupId) return null;
  const idx = groupId - 4286;
  if (idx < 0 || idx > 11) return null;
  return String.fromCharCode(65 + idx);
}

/** livescore position code → DB position */
export function mapPosition(pos: string): "GK" | "DEF" | "MID" | "FWD" {
  switch (pos.toUpperCase()) {
    case "GK":                            return "GK";
    case "DF": case "CB": case "WB":
    case "LB": case "RB":                 return "DEF";
    case "MF": case "AM": case "DM":      return "MID";
    case "FW": case "WF": case "SS":      return "FWD";
    default:                              return "MID";
  }
}

/** Lock simultaneous matchday-3 games 15 min before kickoff */
export function lockTime(kickoffIso_: string): string {
  return new Date(new Date(kickoffIso_).getTime() - 15 * 60 * 1000).toISOString();
}

/** Normalised event for storing in match_events jsonb column */
export interface NormalisedEvent {
  type:        "GOAL" | "BOOKING" | "SUBSTITUTION" | "OWN_GOAL" | "PENALTY";
  minute:      number | null;
  injury_time: number | null;
  team_side:   "home" | "away";
  player:      string | null;
  assist?:     string | null;
  card?:       string | null;
  player_out?: string | null;
  player_in?:  string | null;
}

export function normaliseEvents(events: LSEvent[]): NormalisedEvent[] {
  return events
    .map((e): NormalisedEvent | null => {
      const minute = parseInt(e.time) || null;
      const side   = e.home_away === "h" ? "home" : "away";
      const base   = { minute, injury_time: null, team_side: side } as const;
      switch (e.event) {
        case "GOAL":         return { ...base, type: "GOAL",         player: e.player, assist: e.info ?? null };
        case "OWN GOAL":     return { ...base, type: "OWN_GOAL",     player: e.player };
        case "PENALTY GOAL": return { ...base, type: "PENALTY",      player: e.player };
        case "YELLOW CARD":  return { ...base, type: "BOOKING",      player: e.player, card: "YELLOW" };
        case "RED CARD":     return { ...base, type: "BOOKING",      player: e.player, card: "RED" };
        case "YELLOW RED CARD": return { ...base, type: "BOOKING",   player: e.player, card: "YELLOW_RED" };
        case "SUBSTITUTION": return { ...base, type: "SUBSTITUTION", player_out: e.player, player_in: e.info ?? null };
        default:             return null;
      }
    })
    .filter((e): e is NormalisedEvent => e !== null)
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
}
