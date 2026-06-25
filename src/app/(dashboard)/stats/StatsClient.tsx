"use client";

import { useState } from "react";
import { FLAG } from "@/lib/fixtures-data";

interface PlayerStat {
  player: string;
  teamCode: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

interface Props {
  topScorers: PlayerStat[];
  topAssists: PlayerStat[];
  topYellows: PlayerStat[];
  topReds: PlayerStat[];
  matchCount: number;
}

type Tab = "scorers" | "assists" | "yellows" | "reds";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "scorers",  label: "Top Scorers",  emoji: "⚽" },
  { id: "assists",  label: "Assists",       emoji: "🎯" },
  { id: "yellows",  label: "Yellow Cards",  emoji: "🟨" },
  { id: "reds",     label: "Red Cards",     emoji: "🟥" },
];

const BRAND = "#1D9E75";

function PlayerRow({
  rank,
  stat,
  value,
  subLabel,
}: {
  rank: number;
  stat: PlayerStat;
  value: number;
  subLabel: string;
}) {
  const flag = FLAG[stat.teamCode] ?? "🏳️";
  const rankColor =
    rank === 1 ? "text-amber-500 font-black" :
    rank === 2 ? "text-gray-400 font-bold" :
    rank === 3 ? "text-orange-400 font-bold" :
    "text-gray-300 font-medium";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className={`w-6 text-sm text-center flex-shrink-0 ${rankColor}`}>{rank}</span>
      <span className="text-xl leading-none flex-shrink-0">{flag}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{stat.player}</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{stat.teamCode}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-xl font-black" style={{ color: BRAND }}>{value}</p>
        <p className="text-[10px] text-gray-400">{subLabel}</p>
      </div>
    </div>
  );
}

export function StatsClient({ topScorers, topAssists, topYellows, topReds, matchCount }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("scorers");

  function getRows(): { stat: PlayerStat; value: number; subLabel: string }[] {
    switch (activeTab) {
      case "scorers": return topScorers.map((s) => ({ stat: s, value: s.goals,       subLabel: s.goals === 1 ? "goal" : "goals" }));
      case "assists": return topAssists.map((s) => ({ stat: s, value: s.assists,     subLabel: s.assists === 1 ? "assist" : "assists" }));
      case "yellows": return topYellows.map((s) => ({ stat: s, value: s.yellowCards, subLabel: "yellow" + (s.yellowCards !== 1 ? "s" : "") }));
      case "reds":    return topReds.map((s)    => ({ stat: s, value: s.redCards,    subLabel: "red card" + (s.redCards !== 1 ? "s" : "") }));
    }
  }

  const rows = getRows();

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="text-center space-y-1 py-2">
        <h1 className="text-2xl font-black text-gray-900">Tournament Stats</h1>
        <p className="text-sm text-gray-400">
          FIFA World Cup 2026 · {matchCount} matches played
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex flex-col items-center py-2 px-1 rounded-lg text-xs font-semibold transition-all gap-0.5"
            style={
              activeTab === tab.id
                ? { backgroundColor: BRAND, color: "#fff" }
                : { color: "#6b7280" }
            }
          >
            <span className="text-base leading-none">{tab.emoji}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4">
        {rows.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">No data yet</p>
        ) : (
          rows.map(({ stat, value, subLabel }, i) => (
            <PlayerRow
              key={`${stat.player}|${stat.teamCode}`}
              rank={i + 1}
              stat={stat}
              value={value}
              subLabel={subLabel}
            />
          ))
        )}
      </div>
    </div>
  );
}
