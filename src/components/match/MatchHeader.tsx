"use client";

import { FLAG } from "@/lib/fixtures-data";
import type { Match } from "@/types/database";

// FIFA World Rankings (June 2026) for WC2026 participating teams
const FIFA_RANK: Record<string, number> = {
  ARG: 1, FRA: 2, ESP: 3, ENG: 4, BRA: 5, POR: 6, BEL: 7, NED: 8,
  GER: 9, URY: 10, COL: 11, USA: 12, ITA: 13, MEX: 14, JPN: 15,
  MAR: 16, SUI: 17, CRO: 18, SEN: 19, DEN: 20, AUT: 21, SCO: 22,
  TUR: 23, UKR: 24, NOR: 25, SWE: 26, CZE: 27, KOR: 28, AUS: 29,
  IRN: 30, CMR: 31, EGY: 32, RSA: 33, NZL: 34, CIV: 35, ECU: 36,
  PAR: 37, KSA: 38, PAN: 39, CPV: 40, QAT: 41, IRQ: 42, JOR: 43,
  ALG: 44, GHA: 45, CAN: 46, TUN: 47, UZB: 48, NGA: 49, HAI: 50,
  COD: 55, BIH: 56, CUW: 99,
};

const BRAND = "#1D9E75";

function statusPill(status: Match["status"]) {
  if (status === "live")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        LIVE
      </span>
    );
  if (status === "finished")
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
        Full Time
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
      Upcoming
    </span>
  );
}

function formatKickoffUK(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/London", timeZoneName: "short",
  }).format(new Date(iso));
}

export function MatchHeader({ match }: { match: Match }) {
  const homeFlag = FLAG[match.home_team_code] ?? "🏳️";
  const awayFlag = FLAG[match.away_team_code] ?? "🏳️";
  const finished = match.status === "finished";
  const live     = match.status === "live";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 mb-4">
      <div className="flex flex-col items-center gap-3">
        {/* Status */}
        <div>{statusPill(match.status)}</div>

        {/* Teams + score row */}
        <div className="flex items-center justify-center gap-4 w-full">
          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-4xl leading-none">{homeFlag}</span>
            <span className="text-sm font-bold text-gray-900 text-center leading-tight">{match.home_team}</span>
            <span className="text-xs text-gray-400">{match.home_team_code}</span>
            {FIFA_RANK[match.home_team_code] && (
              <span className="text-[10px] text-gray-300 font-medium">FIFA: {FIFA_RANK[match.home_team_code]}</span>
            )}
          </div>

          {/* Score / VS */}
          <div className="flex-shrink-0 text-center px-2">
            {finished || live ? (
              <p className="text-5xl font-black tracking-tight" style={{ color: finished ? "#111" : BRAND }}>
                {match.home_score ?? 0} <span className="text-gray-300">–</span> {match.away_score ?? 0}
              </p>
            ) : (
              <>
                <p className="text-2xl font-black text-gray-200">VS</p>
                <p className="text-xs text-gray-400 mt-1">{formatKickoffUK(match.kickoff_at)}</p>
              </>
            )}
            {(finished || live) && (
              <p className="text-xs text-gray-400 mt-1">{formatKickoffUK(match.kickoff_at)}</p>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-4xl leading-none">{awayFlag}</span>
            <span className="text-sm font-bold text-gray-900 text-center leading-tight">{match.away_team}</span>
            <span className="text-xs text-gray-400">{match.away_team_code}</span>
            {FIFA_RANK[match.away_team_code] && (
              <span className="text-[10px] text-gray-300 font-medium">FIFA: {FIFA_RANK[match.away_team_code]}</span>
            )}
          </div>
        </div>

        {/* Venue */}
        {match.venue && (
          <p className="text-xs text-gray-400">{match.venue}</p>
        )}
      </div>
    </div>
  );
}
