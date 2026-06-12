"use client";

import { useState } from "react";
import Link from "next/link";
import type { LeaderboardEntry } from "@/types/database";
import { LeaderboardTable } from "./LeaderboardTable";

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
