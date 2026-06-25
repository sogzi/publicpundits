import { createAdminClient } from "@/lib/supabase/admin";
import { StatsClient } from "./StatsClient";
import type { MatchEvent } from "@/types/database";

export const revalidate = 300; // refresh every 5 min

interface PlayerStat {
  player: string;
  teamCode: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export default async function StatsPage() {
  const admin = createAdminClient();

  const { data: matches } = await (admin as any)
    .from("matches")
    .select("home_team_code, away_team_code, match_events")
    .eq("status", "finished")
    .not("match_events", "is", null);

  // Aggregate stats from all match events
  const playerMap = new Map<string, PlayerStat>();

  function getOrCreate(player: string, teamCode: string): PlayerStat {
    const key = `${player}|${teamCode}`;
    if (!playerMap.has(key)) {
      playerMap.set(key, { player, teamCode, goals: 0, assists: 0, yellowCards: 0, redCards: 0 });
    }
    return playerMap.get(key)!;
  }

  for (const match of matches ?? []) {
    const events: MatchEvent[] = match.match_events ?? [];
    const homeCode = match.home_team_code as string;
    const awayCode = match.away_team_code as string;

    for (const e of events) {
      const teamCode = e.team_side === "home" ? homeCode : awayCode;
      const oppCode  = e.team_side === "home" ? awayCode : homeCode;

      if (e.type === "GOAL" || e.type === "PENALTY GOAL") {
        if (e.player) getOrCreate(e.player, teamCode).goals++;
        if (e.assist) getOrCreate(e.assist, teamCode).assists++;
      }
      if (e.type === "OWN GOAL" && e.player) {
        // Own goal — scored for the opponent, attribute to own team
        getOrCreate(e.player, teamCode).goals++;
      }
      if (e.type === "YELLOW CARD" && e.player) {
        getOrCreate(e.player, teamCode).yellowCards++;
      }
      if (e.type === "RED CARD" && e.player) {
        getOrCreate(e.player, teamCode).redCards++;
      }
    }
  }

  const allStats = Array.from(playerMap.values());

  const topScorers  = [...allStats].filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, 20);
  const topAssists  = [...allStats].filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 20);
  const topYellows  = [...allStats].filter((p) => p.yellowCards > 0).sort((a, b) => b.yellowCards - a.yellowCards).slice(0, 20);
  const topReds     = [...allStats].filter((p) => p.redCards > 0).sort((a, b) => b.redCards - a.redCards).slice(0, 10);

  return (
    <StatsClient
      topScorers={topScorers}
      topAssists={topAssists}
      topYellows={topYellows}
      topReds={topReds}
      matchCount={(matches ?? []).length}
    />
  );
}
