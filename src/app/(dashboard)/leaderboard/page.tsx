import { createClient } from "@/lib/supabase/server";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";

export const revalidate = 120;

export default async function LeaderboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: entries } = await supabase
    .from("leaderboard")
    .select("*")
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Leaderboard</h1>
        <p className="text-gray-500 text-sm mt-1">Top 100 predictors by total points</p>
      </div>
      <LeaderboardTable entries={entries ?? []} currentUserId={user?.id} />
    </div>
  );
}
