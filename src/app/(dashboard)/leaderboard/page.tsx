import { createClient } from "@/lib/supabase/server";
import { LeaderboardClient } from "@/components/leaderboard/LeaderboardClient";
import type { LeaderboardEntry } from "@/types/database";

export const revalidate = 120;

export default async function LeaderboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // All users ranked by total points
  const { data: overall } = await supabase
    .from("leaderboard")
    .select("*")
    .order("total_points", { ascending: false })
    .limit(200);

  // Active round — find the current/most-recent stage with activity
  const { data: activeMatches } = await supabase
    .from("matches")
    .select("stage")
    .in("status", ["live", "finished"])
    .order("kickoff_at", { ascending: false })
    .limit(1);

  const activeStage = activeMatches?.[0]?.stage ?? "group";

  // This-round predictions for the active stage
  const { data: roundPreds } = await (supabase as any)
    .from("score_predictions")
    .select("user_id, points_awarded, match_stage, correct_score, correct_outcome")
    .eq("match_stage", activeStage)
    .not("points_awarded", "is", null);

  // Aggregate round predictions per user
  type RoundAgg = { pts: number; correct_scores: number; correct_outcomes: number; form: LeaderboardEntry["recent_form"] };
  const roundByUser: Record<string, RoundAgg> = {};
  for (const p of roundPreds ?? []) {
    if (!roundByUser[p.user_id]) {
      roundByUser[p.user_id] = { pts: 0, correct_scores: 0, correct_outcomes: 0, form: [] };
    }
    roundByUser[p.user_id].pts += p.points_awarded ?? 0;
    if (p.correct_score)   roundByUser[p.user_id].correct_scores++;
    if (p.correct_outcome) roundByUser[p.user_id].correct_outcomes++;
    roundByUser[p.user_id].form!.push({
      points:          p.points_awarded,
      match_id:        "",
      correct_score:   p.correct_score,
      correct_outcome: p.correct_outcome,
    });
  }

  const roundEntries: LeaderboardEntry[] = (overall ?? [])
    .filter((e) => roundByUser[e.id])
    .map((e) => ({
      ...e,
      total_points:     roundByUser[e.id].pts,
      correct_scores:   roundByUser[e.id].correct_scores,
      correct_outcomes: roundByUser[e.id].correct_outcomes,
      recent_form:      roundByUser[e.id].form?.slice(-5) ?? [],
    }))
    .sort((a, b) => b.total_points - a.total_points)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  // My league
  let leagueEntries: LeaderboardEntry[] = [];
  let leagueName: string | null = null;
  let leagueInviteCode: string | null = null;

  if (user) {
    const { data: membership } = await (supabase as any)
      .from("league_members")
      .select("league_id, leagues(name, invite_code)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membership) {
      leagueName       = (membership.leagues as any)?.name ?? null;
      leagueInviteCode = (membership.leagues as any)?.invite_code ?? null;

      const { data: members } = await (supabase as any)
        .from("league_members")
        .select("user_id")
        .eq("league_id", membership.league_id);

      const memberIds = new Set((members ?? []).map((m: any) => m.user_id as string));

      leagueEntries = (overall ?? [])
        .filter((e) => memberIds.has(e.id))
        .sort((a, b) => b.total_points - a.total_points)
        .map((e, i) => ({ ...e, rank: i + 1 }));
    }
  }

  return (
    <LeaderboardClient
      overall={overall ?? []}
      roundEntries={roundEntries}
      leagueEntries={leagueEntries}
      activeStage={activeStage}
      currentUserId={user?.id}
      leagueName={leagueName}
      leagueInviteCode={leagueInviteCode}
    />
  );
}
