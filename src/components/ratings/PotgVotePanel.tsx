"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface PlayerRow {
  name: string;
  team_code: string;
  votes: number;
}

interface Props {
  matchId: string;
  userId: string;
  players: PlayerRow[];
  userVote?: string | null;
}

export function PotgVotePanel({ matchId, userId, players, userVote: initialVote }: Props) {
  const [userVote, setUserVote] = useState(initialVote ?? null);
  const [localCounts, setLocalCounts] = useState(
    Object.fromEntries(players.map((p) => [p.name, p.votes]))
  );
  const [saving, setSaving] = useState(false);
  const total = Object.values(localCounts).reduce((a, b) => a + b, 0);

  async function vote(playerName: string, teamCode: string) {
    if (saving) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("potg_votes").upsert({
      user_id: userId,
      match_id: matchId,
      player_name: playerName,
      team_code: teamCode,
    }, { onConflict: "user_id,match_id" });

    setLocalCounts((prev) => {
      const next = { ...prev };
      if (userVote && next[userVote] > 0) next[userVote]--;
      next[playerName] = (next[playerName] ?? 0) + 1;
      return next;
    });
    setUserVote(playerName);
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
        <Star className="h-4 w-4 text-yellow-500" /> Player of the Game
      </h3>
      {players.sort((a, b) => (localCounts[b.name] ?? 0) - (localCounts[a.name] ?? 0)).map((player) => {
        const count = localCounts[player.name] ?? 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <button
            key={player.name}
            onClick={() => vote(player.name, player.team_code)}
            disabled={saving}
            className={cn(
              "w-full text-left rounded-lg p-3 border transition-all",
              userVote === player.name
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                : "border-gray-200 hover:border-emerald-300 dark:border-gray-700"
            )}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">{player.name}</span>
              <span className="text-xs text-gray-500">{count} votes · {pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
