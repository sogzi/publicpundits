import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LeaguesClient } from "./LeaguesClient";

export const revalidate = 0;

export default async function LeaguesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Fetch leagues the user is a member of, with member count + user rank
  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, name, invite_code, owner_id)")
    .eq("user_id", user.id);

  // For each league, get member count and user's rank (by total_points from leaderboard view)
  const leagueIds = (memberships ?? []).map((m: any) => m.league_id as string);

  let enriched: any[] = [];
  if (leagueIds.length > 0) {
    // Get all members for these leagues
    const { data: allMembers } = await supabase
      .from("league_members")
      .select("league_id, user_id")
      .in("league_id", leagueIds);

    // Get leaderboard data for all relevant users
    const allUserIds = Array.from(new Set((allMembers ?? []).map((m: any) => m.user_id as string)));
    const { data: leaderboard } = await supabase
      .from("leaderboard")
      .select("id, total_points, rank")
      .in("id", allUserIds);

    const pointsMap: Record<string, number> = {};
    for (const e of (leaderboard ?? []) as { id: string; total_points: number }[]) {
      pointsMap[e.id] = e.total_points ?? 0;
    }

    // Group members by league
    const membersByLeague: Record<string, string[]> = {};
    for (const m of (allMembers ?? []) as { league_id: string; user_id: string }[]) {
      if (!membersByLeague[m.league_id]) membersByLeague[m.league_id] = [];
      membersByLeague[m.league_id].push(m.user_id);
    }

    enriched = (memberships ?? []).map((m: any) => {
      const league = m.leagues as any;
      const members = membersByLeague[m.league_id] ?? [];
      // Sort members by points descending, find user rank
      const sorted = [...members].sort((a, b) => (pointsMap[b] ?? 0) - (pointsMap[a] ?? 0));
      const rank = sorted.indexOf(user.id) + 1;
      return {
        id: league.id,
        name: league.name,
        invite_code: league.invite_code,
        owner_id: league.owner_id,
        member_count: members.length,
        user_rank: rank,
      };
    });
  }

  return <LeaguesClient userId={user.id} leagues={enriched} />;
}
