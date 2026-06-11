"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Match } from "@/types/database";

const BRAND = "#1D9E75";

interface Player {
  name: string;
  team_code: string;
  position: string;
  shirt: number;
}

interface RatingAgg {
  [playerName: string]: { team_code: string; sum: number; count: number };
}

interface Props {
  match: Match;
  userId: string | null;
  players: Player[];
  ratingAgg: RatingAgg;
  userRatingMap: Record<string, number>;
}

const POS_COLOR: Record<string, string> = {
  GK: "bg-yellow-100 text-yellow-700",
  DEF: "bg-blue-100 text-blue-700",
  MID: "bg-green-100 text-green-700",
  FWD: "bg-red-100 text-red-700",
};

function StarRow({ max, value, onChange, disabled }: { max: number; value: number | null; onChange: (n: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const filled = (hover ?? value ?? 0) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            onMouseEnter={() => !disabled && setHover(n)}
            onMouseLeave={() => setHover(null)}
            className={`w-6 h-6 rounded text-xs font-bold transition-colors ${
              filled ? "text-white" : "bg-gray-100 text-gray-300 hover:bg-gray-200"
            } ${disabled ? "cursor-default" : "cursor-pointer"}`}
            style={filled ? { backgroundColor: BRAND } : undefined}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

export function RateTab({ match, userId, players, ratingAgg, userRatingMap }: Props) {
  const [ratings, setRatings] = useState<Record<string, number>>(userRatingMap);
  const [saving, setSaving] = useState<string | null>(null);
  const [agg, setAgg] = useState<RatingAgg>(ratingAgg);

  if (match.status !== "finished") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">⭐</span>
        <h3 className="text-lg font-bold text-gray-900">Ratings open after the match</h3>
        <p className="text-sm text-gray-400 mt-1">Come back once the final whistle has blown.</p>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">📋</span>
        <h3 className="text-lg font-bold text-gray-900">No lineup data yet</h3>
        <p className="text-sm text-gray-400 mt-1">Lineups need to be confirmed before players can be rated.</p>
      </div>
    );
  }

  async function rate(player: Player, value: number) {
    if (!userId || saving === player.name) return;
    setSaving(player.name);
    setRatings((r) => ({ ...r, [player.name]: value }));
    const supabase = createClient();
    await (supabase as any).from("player_ratings").upsert({
      user_id: userId,
      match_id: match.id,
      player_name: player.name,
      team_code: player.team_code,
      rating: value,
    }, { onConflict: "user_id,match_id,player_name" });
    // Update local agg optimistically
    setAgg((prev) => {
      const old = prev[player.name] ?? { team_code: player.team_code, sum: 0, count: 0 };
      const hadPrev = userRatingMap[player.name] != null;
      const newSum = hadPrev ? old.sum - (userRatingMap[player.name] ?? 0) + value : old.sum + value;
      const newCount = hadPrev ? old.count : old.count + 1;
      return { ...prev, [player.name]: { ...old, sum: newSum, count: newCount } };
    });
    setSaving(null);
  }

  // Group by team
  const homeTeamPlayers = players.filter((p) => p.team_code === match.home_team_code);
  const awayTeamPlayers = players.filter((p) => p.team_code === match.away_team_code);

  function renderTeam(teamPlayers: Player[], teamName: string) {
    return (
      <div>
        <h3 className="font-bold text-sm text-gray-900 mb-3 pb-2 border-b border-gray-100">{teamName}</h3>
        <div className="space-y-2">
          {teamPlayers.map((player) => {
            const userRating = ratings[player.name] ?? null;
            const aggData = agg[player.name];
            const avgRating = aggData && aggData.count > 0 ? aggData.sum / aggData.count : null;
            const isRated = userRating !== null;

            return (
              <div key={player.name} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                {/* Shirt + position */}
                <div className="flex-shrink-0 flex items-center gap-1.5 w-16">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center">
                    {player.shirt}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${POS_COLOR[player.position] ?? "bg-gray-100 text-gray-500"}`}>
                    {player.position}
                  </span>
                </div>

                {/* Name */}
                <span className="flex-1 text-sm font-medium text-gray-900 truncate min-w-0">
                  {player.name.split(" ").slice(-1)[0]}
                  <span className="text-gray-400 text-xs ml-1 hidden sm:inline">{player.name.split(" ").slice(0, -1).join(" ")}</span>
                </span>

                {/* Rating or average */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {!userId ? (
                    <span className="text-xs text-gray-300">Sign in to rate</span>
                  ) : isRated ? (
                    <>
                      <StarRow max={10} value={userRating} onChange={(v) => rate(player, v)} disabled={saving === player.name} />
                      {avgRating !== null && (
                        <span className="text-xs text-gray-400 w-16 text-right">
                          avg <span className="font-bold text-gray-700">{avgRating.toFixed(1)}</span>
                          <span className="text-gray-300"> / {aggData?.count ?? 0}</span>
                        </span>
                      )}
                    </>
                  ) : (
                    <StarRow max={10} value={null} onChange={(v) => rate(player, v)} disabled={saving === player.name} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-400 text-center">Rate each player's performance from 1–10</p>
      {renderTeam(homeTeamPlayers, match.home_team)}
      {renderTeam(awayTeamPlayers, match.away_team)}
    </div>
  );
}
