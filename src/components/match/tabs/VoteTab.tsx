"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FLAG } from "@/lib/fixtures-data";
import type { Match } from "@/types/database";

const BRAND = "#1D9E75";

interface Player {
  name: string;
  team_code: string;
  position: string;
  shirt: number;
}

interface Props {
  match: Match;
  userId: string | null;
  players: Player[];
  potgAgg: Record<string, { team_code: string; votes: number }>;
  userVote: string | null;
}

export function VoteTab({ match, userId, players, potgAgg, userVote: initialVote }: Props) {
  const [userVote, setUserVote] = useState(initialVote);
  const [agg, setAgg] = useState(potgAgg);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const totalVotes = Object.values(agg).reduce((s, v) => s + v.votes, 0);
  const hasVoted   = userVote !== null;
  const showResults = hasVoted;

  if (match.status !== "finished") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">🏆</span>
        <h3 className="text-lg font-bold text-gray-900">Voting opens after the match</h3>
        <p className="text-sm text-gray-400 mt-1">Cast your Player of the Game vote once the final whistle blows.</p>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">📋</span>
        <h3 className="text-lg font-bold text-gray-900">No players available</h3>
        <p className="text-sm text-gray-400 mt-1">Lineup data is needed for POTG voting.</p>
      </div>
    );
  }

  async function castVote(player: Player) {
    if (!userId || saving) return;
    setSaving(true);
    const supabase = createClient();
    await (supabase as any).from("potg_votes").upsert({
      user_id: userId,
      match_id: match.id,
      player_name: player.name,
      team_code: player.team_code,
    }, { onConflict: "user_id,match_id" });
    // Optimistic update
    setAgg((prev) => {
      const next = { ...prev };
      if (userVote && next[userVote]) {
        next[userVote] = { ...next[userVote], votes: Math.max(0, next[userVote].votes - 1) };
      }
      next[player.name] = { team_code: player.team_code, votes: (next[player.name]?.votes ?? 0) + 1 };
      return next;
    });
    setUserVote(player.name);
    setConfirming(null);
    setSaving(false);
  }

  // Sort players by votes desc for leaderboard
  const ranked = [...players].sort((a, b) => (agg[b.name]?.votes ?? 0) - (agg[a.name]?.votes ?? 0));

  // ── Results / leaderboard view ──────────────────────────────────────────
  if (showResults) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Player of the Game</h2>
          <span className="text-xs text-gray-400">{totalVotes} votes</span>
        </div>
        {ranked.map((player, i) => {
          const votes = agg[player.name]?.votes ?? 0;
          const pct   = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isWinning = i === 0 && votes > 0;
          const isMyVote  = userVote === player.name;

          return (
            <div
              key={player.name}
              className={`rounded-xl p-3 border transition-all ${
                isMyVote ? "border-emerald-300 bg-emerald-50" : "border-gray-100 bg-white"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {/* Rank */}
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                  isWinning ? "text-white" : "bg-gray-100 text-gray-500"
                }`} style={isWinning ? { backgroundColor: "#f59e0b" } : undefined}>
                  {isWinning ? "🏆" : i + 1}
                </span>

                {/* Flag + name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{FLAG[player.team_code] ?? "🏳️"}</span>
                    <span className="text-sm font-bold text-gray-900 truncate">{player.name}</span>
                    {isMyVote && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full flex-shrink-0">Your vote</span>}
                  </div>
                  <span className="text-xs text-gray-400">{player.position} · {player.team_code}</span>
                </div>

                {/* Votes + pct */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-gray-900">{pct}%</p>
                  <p className="text-xs text-gray-400">{votes} votes</p>
                </div>
              </div>

              {/* Bar */}
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: isWinning ? "#f59e0b" : isMyVote ? BRAND : "#d1d5db" }}
                />
              </div>
            </div>
          );
        })}

        {/* Change vote option */}
        <button
          onClick={() => setUserVote(null)}
          className="w-full text-xs text-gray-400 underline hover:text-gray-600 py-2"
        >
          Change my vote
        </button>
      </div>
    );
  }

  // ── Voting selection view ───────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-gray-900">Player of the Game</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {!userId ? "Sign in to vote" : confirming ? `Confirm your vote for ${confirming}?` : "Tap a player to vote"}
        </p>
      </div>

      {/* Confirm vote overlay */}
      {confirming && (
        <div className="rounded-xl border-2 p-4 text-center space-y-3" style={{ borderColor: BRAND }}>
          <p className="font-bold text-gray-900">Vote for <span style={{ color: BRAND }}>{confirming}</span>?</p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirming(null)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={() => {
                const p = players.find((pl) => pl.name === confirming);
                if (p) castVote(p);
              }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: BRAND }}
            >
              {saving ? "Voting…" : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {/* Player grid — home team then away team */}
      {[match.home_team_code, match.away_team_code].map((teamCode) => {
        const teamPlayers = players.filter((p) => p.team_code === teamCode);
        const teamName    = teamCode === match.home_team_code ? match.home_team : match.away_team;
        return (
          <div key={teamCode}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span>{FLAG[teamCode] ?? "🏳️"}</span> {teamName}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {teamPlayers.map((player) => (
                <button
                  key={player.name}
                  type="button"
                  disabled={!userId || saving}
                  onClick={() => userId && setConfirming(confirming === player.name ? null : player.name)}
                  className={`text-left rounded-xl border p-3 transition-all ${
                    confirming === player.name
                      ? "border-emerald-400 bg-emerald-50 shadow-sm"
                      : "border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm"
                  } ${!userId ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                      {player.shirt}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">{player.position}</span>
                  </div>
                  <p className="text-xs font-bold text-gray-900 leading-tight truncate">{player.name.split(" ").slice(-1)[0]}</p>
                  <p className="text-[10px] text-gray-400 truncate">{player.name.split(" ").slice(0, -1).join(" ")}</p>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {!userId && (
        <a
          href="/login"
          className="block w-full text-center py-3 rounded-xl font-bold text-white text-sm"
          style={{ backgroundColor: BRAND }}
        >
          Sign in to vote
        </a>
      )}
    </div>
  );
}
