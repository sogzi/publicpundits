import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { CopyButton } from "@/components/leagues/CopyButton";
import type { LeaderboardEntry } from "@/types/database";

export const revalidate = 60;

export default async function LeagueLeaderboardPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Fetch the league (RLS: only members can read)
  const { data: league } = await (supabase as any)
    .from("leagues")
    .select("id, name, invite_code, owner_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!league) notFound();

  // Verify current user is a member
  const { data: membership } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/leagues");

  // All member IDs
  const { data: members } = await (supabase as any)
    .from("league_members")
    .select("user_id")
    .eq("league_id", params.id);

  const memberIds = ((members ?? []) as { user_id: string }[]).map((m) => m.user_id);

  // Leaderboard entries for those members only
  const { data: entries } = await supabase
    .from("leaderboard")
    .select("*")
    .in("id", memberIds)
    .order("total_points", { ascending: false });

  const ranked: LeaderboardEntry[] = ((entries ?? []) as LeaderboardEntry[]).map((e, i) => ({ ...e, rank: i + 1 }));

  const inviteUrl = `https://publicpundits.live/join/${league.invite_code}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/leagues"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        ← Back to Leagues
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{league.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {ranked.length} {ranked.length === 1 ? "member" : "members"}
          </p>
        </div>

        {/* Invite chip */}
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm flex-shrink-0">
          <span className="text-xs text-gray-400">Invite:</span>
          <span className="text-sm font-black font-mono tracking-widest text-emerald-600">
            {league.invite_code}
          </span>
          <CopyButton url={inviteUrl} />
        </div>
      </div>

      {/* Leaderboard */}
      <LeaderboardTable
        entries={ranked}
        currentUserId={user.id}
        emptyMessage="No members have scored points yet. Predictions will appear here after matches finish."
      />
    </div>
  );
}
