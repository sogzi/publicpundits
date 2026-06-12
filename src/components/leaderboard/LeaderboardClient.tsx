"use client";

import { useState } from "react";
import Link from "next/link";
import type { LeaderboardEntry } from "@/types/database";

const BRAND = "#1D9E75";

const STAGE_LABEL: Record<string, string> = {
  group:         "Group Stage",
  round_of_32:   "Round of 32",
  round_of_16:   "Round of 16",
  quarter_final: "Quarter-finals",
  semi_final:    "Semi-finals",
  third_place:   "3rd Place Play-off",
  final:         "Final",
};

// ─── Form dot ────────────────────────────────────────────────────────────────
function FormDot({ correct_score, correct_outcome, points }: {
  correct_score:   boolean | null;
  correct_outcome: boolean | null;
  points:          number | null;
}) {
  let bg    = "#E5E7EB"; // grey = wrong
  let title = "Incorrect";
  if (correct_score)   { bg = BRAND;     title = "Correct score (+3)"; }
  else if (correct_outcome) { bg = "#FCD34D"; title = "Correct outcome (+1)"; }
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: bg }}
      title={title}
    />
  );
}

// ─── Rank medal ──────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg leading-none" title="1st">🥇</span>;
  if (rank === 2) return <span className="text-lg leading-none" title="2nd">🥈</span>;
  if (rank === 3) return <span className="text-lg leading-none" title="3rd">🥉</span>;
  return <span className="text-sm font-bold text-gray-500 tabular-nums w-6 text-center">{rank}</span>;
}

// ─── Avatar initial ──────────────────────────────────────────────────────────
function Avatar({ name, isMe }: { name: string; isMe: boolean }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 uppercase"
      style={
        isMe
          ? { backgroundColor: BRAND, color: "#fff" }
          : { backgroundColor: "#F3F4F6", color: "#374151" }
      }
    >
      {(name ?? "?")[0]}
    </div>
  );
}

// ─── Single leaderboard row ──────────────────────────────────────────────────
function LeaderboardRow({ entry, currentUserId }: { entry: LeaderboardEntry; currentUserId?: string }) {
  const isMe = entry.id === currentUserId;
  const form = (entry.recent_form ?? []).slice(0, 5);

  return (
    <tr
      className="border-b border-gray-50 last:border-0 transition-colors"
      style={isMe ? { backgroundColor: "#F0FDF4" } : undefined}
    >
      {/* Rank */}
      <td className="pl-4 pr-2 py-3 w-10">
        <div className="flex items-center justify-center">
          <RankBadge rank={entry.rank} />
        </div>
      </td>

      {/* Player */}
      <td className="px-2 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={entry.username} isMe={isMe} />
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${isMe ? "text-emerald-700" : "text-gray-900"}`}>
              {entry.display_name ?? entry.username}
              {isMe && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-500">You</span>}
            </p>
            <p className="text-xs text-gray-400 truncate">@{entry.username}</p>
          </div>
        </div>
      </td>

      {/* Form dots */}
      <td className="px-2 py-3 hidden sm:table-cell">
        <div className="flex items-center gap-1">
          {form.length > 0
            ? form.map((f, i) => (
                <FormDot key={i} correct_score={f.correct_score} correct_outcome={f.correct_outcome} points={f.points} />
              ))
            : <span className="text-xs text-gray-300">—</span>
          }
          {/* Pad with grey dots if < 5 predictions */}
          {Array.from({ length: Math.max(0, 5 - form.length) }).map((_, i) => (
            <span key={`pad-${i}`} className="inline-block w-2.5 h-2.5 rounded-full bg-gray-100 flex-shrink-0" />
          ))}
        </div>
      </td>

      {/* Correct scores */}
      <td className="px-2 py-3 text-center hidden md:table-cell">
        <span className="text-sm font-semibold" style={{ color: BRAND }}>{entry.correct_scores}</span>
      </td>

      {/* Correct outcomes */}
      <td className="px-2 py-3 text-center hidden md:table-cell">
        <span className="text-sm font-semibold text-yellow-500">{entry.correct_outcomes}</span>
      </td>

      {/* Total points */}
      <td className="pr-4 pl-2 py-3 text-right">
        <span className={`text-base font-black tabular-nums ${isMe ? "text-emerald-600" : "text-gray-900"}`}>
          {entry.total_points}
        </span>
        <span className="text-[10px] text-gray-400 ml-0.5">pts</span>
      </td>
    </tr>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
function LeaderboardTable({ entries, currentUserId, emptyMessage }: {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  emptyMessage?: React.ReactNode;
}) {
  if (!entries.length) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        {emptyMessage ?? "No data yet."}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="pl-4 pr-2 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide w-10">#</th>
            <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">Player</th>
            <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Form</th>
            <th className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wide hidden md:table-cell" title="Correct scores">✓ Scores</th>
            <th className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wide hidden md:table-cell" title="Correct outcomes">~ Results</th>
            <th className="pr-4 pl-2 py-2.5 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wide">Points</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <LeaderboardRow key={entry.id} entry={entry} currentUserId={currentUserId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Points breakdown card ────────────────────────────────────────────────────
function PointsBreakdown() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Points System</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { pts: "3",   label: "Correct score",          color: BRAND,      sub: "Exact scoreline" },
          { pts: "1",   label: "Correct result",         color: "#F59E0B",  sub: "Win / Draw / Loss" },
          { pts: "0.5", label: "Lineup hit",             color: "#6366F1",  sub: "Per player, up to 5 pts" },
          { pts: "0",   label: "Wrong",                  color: "#9CA3AF",  sub: "No points awarded" },
        ].map(({ pts, label, color, sub }) => (
          <div key={label} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50">
            <span
              className="mt-0.5 text-base font-black flex-shrink-0 w-7 text-center"
              style={{ color }}
            >
              {pts}
            </span>
            <div>
              <p className="text-xs font-semibold text-gray-900 leading-tight">{label}</p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────
type Tab = "overall" | "round" | "league";

interface Props {
  overall:         LeaderboardEntry[];
  roundEntries:    LeaderboardEntry[];
  leagueEntries:   LeaderboardEntry[];
  activeStage:     string;
  currentUserId?:  string;
  leagueName:      string | null;
  leagueInviteCode: string | null;
}

export function LeaderboardClient({
  overall, roundEntries, leagueEntries,
  activeStage, currentUserId, leagueName, leagueInviteCode,
}: Props) {
  const [tab, setTab] = useState<Tab>("overall");

  const tabs: { key: Tab; label: string }[] = [
    { key: "overall", label: "Overall" },
    { key: "round",   label: STAGE_LABEL[activeStage] ?? "This Round" },
    { key: "league",  label: "My League" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Leaderboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Who's predicting best at WC2026?
        </p>
      </div>

      {/* Points breakdown */}
      <PointsBreakdown />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
            style={
              tab === key
                ? { backgroundColor: "#fff", color: BRAND, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                : { backgroundColor: "transparent", color: "#6B7280" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overall" && (
        <LeaderboardTable entries={overall} currentUserId={currentUserId} />
      )}

      {tab === "round" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 text-center">
            Points from <span className="font-semibold text-gray-600">{STAGE_LABEL[activeStage] ?? activeStage}</span> predictions only
          </p>
          <LeaderboardTable
            entries={roundEntries}
            currentUserId={currentUserId}
            emptyMessage={<>No graded predictions for this round yet. Check back after matches finish.</>}
          />
        </div>
      )}

      {tab === "league" && (
        <div className="space-y-4">
          {leagueEntries.length > 0 ? (
            <>
              {leagueName && (
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-bold text-gray-900">{leagueName}</p>
                  {leagueInviteCode && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Invite code:</span>
                      <span
                        className="text-xs font-black px-2 py-1 rounded-lg tracking-widest"
                        style={{ backgroundColor: "#F0FDF4", color: BRAND }}
                      >
                        {leagueInviteCode}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <LeaderboardTable entries={leagueEntries} currentUserId={currentUserId} />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center space-y-4">
              <div className="text-4xl">🏆</div>
              <div>
                <p className="font-bold text-gray-900 text-base">No league yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Create a private league and compete with friends
                </p>
              </div>
              <Link
                href="/leagues"
                className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: BRAND }}
              >
                Join or create a league →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
