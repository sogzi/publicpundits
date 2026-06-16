/**
 * Supabase Edge Function: sync-match-results
 *
 * Scheduled every 5 minutes via pg_cron (migration 006).
 *
 * Uses livescore-api.com (WC2026 competition_id = 362).
 *
 * Flow:
 *   1. Load 'upcoming' + 'live' matches from DB (with api_football_id set).
 *   2. If none are near kickoff or live → exit early (saves API quota).
 *   3. Fetch live scores + recent history from livescore-api (2 calls).
 *   4. For each changed match, update status + score in DB.
 *   5. For live/finished matches that changed, fetch events + stats (2 calls per match).
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   LIVESCORE_API_KEY    — livescore-api.com key
 *   LIVESCORE_API_SECRET — livescore-api.com secret
 *   (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY injected automatically)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// Types (livescore-api.com minimal subset)
// ─────────────────────────────────────────────────────────────────────────────

interface LSTeam {
  id:   string | number;
  name: string;
}

interface LSScores {
  score:    string;
  ht_score: string;
  ft_score: string;
  et_score: string;
  ps_score: string;
}

interface LSMatch {
  id:          number;   // internal livescore id (changes per match instance)
  fixture_id?: number;  // stable planning id — matches our api_football_id column
  date:        string;
  time?:       string;
  status?:     string;
  home:        LSTeam;
  away:        LSTeam;
  scores?:     LSScores;
  group_id?:   number;
  last_changed?: string;
}

interface LSEvent {
  id:        string;
  match_id:  string;
  player:    string;
  time:      string;
  event:     string;  // "GOAL"|"OWN GOAL"|"PENALTY GOAL"|"YELLOW CARD"|"RED CARD"|"SUBSTITUTION"
  home_away: string;  // "h" | "a"
  info?:     string;
}

interface NormalisedEvent {
  type:        "GOAL" | "BOOKING" | "SUBSTITUTION" | "OWN_GOAL" | "PENALTY";
  minute:      number | null;
  injury_time: null;
  team_side:   "home" | "away";
  player:      string | null;
  assist?:     string | null;
  card?:       string | null;
  player_out?: string | null;
  player_in?:  string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const WC = 362;
const LS_BASE = "https://livescore-api.com/api-client";

async function lsFetch<T>(path: string, key: string, secret: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${LS_BASE}${path}${sep}key=${key}&secret=${secret}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`livescore-api ${res.status} ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function mapStatus(match: LSMatch): "upcoming" | "live" | "finished" {
  const status = (match.status ?? "").toUpperCase();
  const time   = match.time ?? "";
  if (status === "FINISHED" || ["FT", "AET", "PEN"].includes(time)) return "finished";
  if (status === "LIVE"     || time === "HT" || /^\d+(\+\d+)?$/.test(time)) return "live";
  return "upcoming";
}

function parseScore(score: string | null | undefined): { home: number | null; away: number | null } {
  if (!score || !score.includes(" - ")) return { home: null, away: null };
  const [h, a] = score.split(" - ");
  const home = parseInt(h);
  const away = parseInt(a);
  return { home: isNaN(home) ? null : home, away: isNaN(away) ? null : away };
}

function normaliseEvents(events: LSEvent[]): NormalisedEvent[] {
  return events
    .map((e): NormalisedEvent | null => {
      const minute = parseInt(e.time) || null;
      const side   = e.home_away === "h" ? "home" : "away";
      const base   = { minute, injury_time: null, team_side: side } as const;
      switch (e.event) {
        case "GOAL":            return { ...base, type: "GOAL",         player: e.player, assist: e.info ?? null };
        case "OWN GOAL":        return { ...base, type: "OWN_GOAL",     player: e.player };
        case "PENALTY GOAL":    return { ...base, type: "PENALTY",      player: e.player };
        case "YELLOW CARD":     return { ...base, type: "BOOKING",      player: e.player, card: "YELLOW" };
        case "RED CARD":        return { ...base, type: "BOOKING",      player: e.player, card: "RED" };
        case "YELLOW RED CARD": return { ...base, type: "BOOKING",      player: e.player, card: "YELLOW_RED" };
        case "SUBSTITUTION":    return { ...base, type: "SUBSTITUTION", player_out: e.player, player_in: e.info ?? null };
        default:                return null;
      }
    })
    .filter((e): e is NormalisedEvent => e !== null)
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey    = Deno.env.get("LIVESCORE_API_KEY");
  const apiSecret = Deno.env.get("LIVESCORE_API_SECRET");

  if (!apiKey || !apiSecret) {
    return new Response(
      JSON.stringify({ error: "LIVESCORE_API_KEY / LIVESCORE_API_SECRET secrets not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const log: string[] = [];
  const updated: string[] = [];
  const errors: string[] = [];

  // Parse body for options
  let force = false;
  try {
    const body = await req.json().catch(() => ({}));
    force = body?.force === true;
  } catch { /* no body */ }

  try {
    // ── Step 1: load DB matches ───────────────────────────────────────────────
    // In force/backfill mode: all statuses. Otherwise: upcoming + live only.
    let matchQuery = supabase
      .from("matches")
      .select("id, api_football_id, home_team, away_team, home_team_code, away_team_code, status, home_score, away_score, kickoff_at")
      .not("api_football_id", "is", null);

    if (!force) {
      matchQuery = matchQuery.in("status", ["upcoming", "live"]);
    }

    const { data: dbMatches, error: dbErr } = await matchQuery;

    if (dbErr) throw new Error(`DB fetch failed: ${dbErr.message}`);
    if (!dbMatches || dbMatches.length === 0) {
      return new Response(
        JSON.stringify({ message: "No matches to sync" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    log.push(`${dbMatches.length} matches loaded (force=${force})`);

    // ── Step 2: smart early-exit (skip in force mode) ─────────────────────────
    if (!force) {
      const now = Date.now();
      const threeHoursMs = 3 * 60 * 60 * 1000;
      const hasRelevant = dbMatches.some((m: any) => {
        if (m.status === "live") return true;
        const kickoff = new Date(m.kickoff_at).getTime();
        return Math.abs(kickoff - now) < threeHoursMs;
      });

      if (!hasRelevant) {
        return new Response(
          JSON.stringify({ message: "No matches within 3 h window — skipping API call", skipped: dbMatches.length }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // ── Step 3: fetch live + history from livescore-api ───────────────────────
    const [liveData, histData] = await Promise.all([
      lsFetch<{ success: boolean; data: { match: LSMatch[] } }>(
        `/matches/live.json?competition_id=${WC}`, apiKey, apiSecret
      ),
      lsFetch<{ success: boolean; data: { match: LSMatch[] } }>(
        `/matches/history.json?competition_id=${WC}`, apiKey, apiSecret
      ),
    ]);

    const lsMatches = [
      ...(liveData.data?.match ?? []),
      ...(histData.data?.match ?? []),
    ];

    // Index by fixture_id (stable planning id = our api_football_id) first,
    // fall back to internal id for matches that only have one or the other
    const lsById = new Map<number, LSMatch>();
    for (const m of lsMatches) {
      if (m.fixture_id) lsById.set(m.fixture_id, m); // preferred: stable id
      lsById.set(m.id, m);                            // fallback: internal id
    }

    log.push(`livescore-api returned ${lsMatches.length} matches (live + history)`);

    // ── Step 4: determine which DB rows need updating ─────────────────────────
    const toUpdate: Array<{
      dbMatch: (typeof dbMatches)[number];
      lsMatch: LSMatch;
      newStatus: "upcoming" | "live" | "finished";
      ftScore: { home: number | null; away: number | null };
    }> = [];

    for (const dbMatch of dbMatches) {
      const lsMatch = lsById.get((dbMatch as any).api_football_id);
      if (!lsMatch) continue;

      const newStatus = mapStatus(lsMatch);
      const ftScore   = parseScore(lsMatch.scores?.ft_score);

      const changed =
        newStatus !== (dbMatch as any).status ||
        (newStatus !== "upcoming" && (
          ftScore.home !== (dbMatch as any).home_score ||
          ftScore.away !== (dbMatch as any).away_score
        ));

      if (changed) toUpdate.push({ dbMatch: dbMatch as any, lsMatch, newStatus, ftScore });
    }

    log.push(`${toUpdate.length} matches need updating`);
    if (toUpdate.length === 0) {
      return new Response(
        JSON.stringify({ message: "All matches already up to date", log }),
        { headers: { "Content-Type": "application/json" } }
      );
    }


    // ── Step 5: fetch events for live/finished matches ────────────────────────
    const eventsMap = new Map<number, NormalisedEvent[]>();
    const needEvents = toUpdate.filter(({ newStatus }) => newStatus !== "upcoming");

    for (let i = 0; i < needEvents.length; i++) {
      const { dbMatch, lsMatch } = needEvents[i];
      // Events endpoint uses internal livescore id (not fixture_id)
      const lsId = lsMatch.id;
      try {
        const data = await lsFetch<{ success: boolean; data: { event: LSEvent[] } }>(
          `/scores/events.json?id=${lsId}`, apiKey, apiSecret
        );
        eventsMap.set(lsMatch.id, normaliseEvents(data.data?.event ?? []));
        log.push(`Events fetched for ${(dbMatch as any).home_team} vs ${(dbMatch as any).away_team}`);
      } catch (err) {
        errors.push(`Events failed for match ${lsId}: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (i < needEvents.length - 1) await sleep(600);
    }

    // ── Step 6: persist updates ───────────────────────────────────────────────
    for (const { dbMatch, lsMatch, newStatus, ftScore } of toUpdate) {
      const patch: Record<string, unknown> = { status: newStatus };

      if (newStatus !== "upcoming") {
        patch.home_score = ftScore.home;
        patch.away_score = ftScore.away;
      }

      const events = eventsMap.get(lsMatch.id);
      if (events !== undefined) patch.match_events = events;

      const { error: upErr } = await supabase
        .from("matches")
        .update(patch)
        .eq("id", (dbMatch as any).id);

      if (upErr) {
        errors.push(`Update failed for ${(dbMatch as any).home_team} vs ${(dbMatch as any).away_team}: ${upErr.message}`);
      } else {
        const score = newStatus !== "upcoming"
          ? ` (${ftScore.home ?? "?"}–${ftScore.away ?? "?"})`
          : "";
        updated.push(`${(dbMatch as any).home_team} vs ${(dbMatch as any).away_team} → ${newStatus}${score}`);
      }
    }

    return new Response(
      JSON.stringify({
        synced_at: new Date().toISOString(),
        checked:   dbMatches.length,
        updated:   updated.length,
        errors:    errors.length,
        matches:   updated,
        log,
        errors,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync-match-results]", message);
    return new Response(
      JSON.stringify({ error: message, log, errors }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
