"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlayerRow {
  name: string;
  team_code: string;
  userRating?: number;
  avgRating?: number;
  totalVotes?: number;
}

interface Props {
  matchId: string;
  userId: string;
  players: PlayerRow[];
}

export function PlayerRatingPanel({ matchId, userId, players: initial }: Props) {
  const [ratings, setRatings] = useState<Record<string, number>>(
    Object.fromEntries(initial.filter((p) => p.userRating).map((p) => [p.name, p.userRating!]))
  );
  const [saving, setSaving] = useState<string | null>(null);

  async function rate(playerName: string, teamCode: string, rating: number) {
    setRatings((r) => ({ ...r, [playerName]: rating }));
    setSaving(playerName);
    const supabase = createClient();
    await supabase.from("player_ratings").upsert({
      user_id: userId,
      match_id: matchId,
      player_name: playerName,
      team_code: teamCode,
      rating,
    }, { onConflict: "user_id,match_id,player_name" });
    setSaving(null);
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Player Ratings</h3>
      {initial.map((player) => (
        <div key={player.name} className="flex items-center gap-3">
          <span className="w-28 text-sm truncate text-gray-800 dark:text-gray-200">{player.name}</span>
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => rate(player.name, player.team_code, n)}
                disabled={saving === player.name}
                className={cn(
                  "w-6 h-6 rounded text-xs font-medium transition-colors",
                  ratings[player.name] === n
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-emerald-100 dark:bg-gray-800 dark:hover:bg-emerald-900"
                )}
              >
                {n}
              </button>
            ))}
          </div>
          {player.avgRating !== undefined && (
            <span className="text-xs text-gray-400 ml-1">avg {player.avgRating.toFixed(1)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
