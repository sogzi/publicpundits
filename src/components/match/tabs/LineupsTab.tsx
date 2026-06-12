"use client";

import { useState, useEffect } from "react";
import { MatchPitch, type PitchPlayerData } from "@/components/match/MatchPitch";
import type { Match } from "@/types/database";

interface TeamLineup {
  teamName:  string;
  teamCode:  string;
  formation: string;
  starters:  PitchPlayerData[];
  subs:      PitchPlayerData[];
}

interface LineupsResponse {
  source?:      "cache" | "api";
  home?:        TeamLineup;
  away?:        TeamLineup;
  notAvailable?: boolean;
  reason?:      string;
  error?:       string;
}

interface Props {
  match: Match;
  /** Legacy prop — kept for interface compatibility; LineupsTab fetches its own data */
  confirmedLineups?: unknown[];
}

// ── Countdown to ~1 h before kickoff ─────────────────────────────────────────
function useCountdown(kickoffIso: string) {
  const kickoff     = new Date(kickoffIso);
  const announcedAt = new Date(kickoff.getTime() - 60 * 60 * 1000);
  const now         = new Date();
  if (now >= announcedAt) return null;
  const diff = announcedAt.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function PitchSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between px-1">
        <div className="space-y-1">
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-6 w-12 bg-gray-200 rounded" />
        </div>
        <div className="space-y-1 items-end flex flex-col">
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-6 w-12 bg-gray-200 rounded" />
        </div>
      </div>
      <div
        className="w-full rounded-2xl bg-gray-200"
        style={{ paddingBottom: "145%" }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function LineupsTab({ match }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "loaded" | "unavailable" | "error">("idle");
  const [lineups, setLineups]   = useState<{ home: TeamLineup; away: TeamLineup } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const countdown = useCountdown(match.kickoff_at);

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    async function fetchLineups() {
      try {
        const res  = await fetch(`/api/lineups?matchId=${match.id}`);
        const data: LineupsResponse = await res.json();

        if (cancelled) return;

        if (data.error) {
          setErrorMsg(data.error);
          setState("error");
          return;
        }

        if (data.notAvailable || !data.home || !data.away) {
          setState("unavailable");
          return;
        }

        setLineups({ home: data.home, away: data.away });
        setState("loaded");
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Network error");
        setState("error");
      }
    }

    fetchLineups();
    return () => { cancelled = true; };
  }, [match.id]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (state === "idle" || state === "loading") {
    return (
      <div>
        <p className="text-xs text-gray-400 text-center mb-4">
          {state === "loading" ? "Fetching lineups…" : ""}
        </p>
        <PitchSkeleton />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <span className="text-4xl">⚠️</span>
        <h3 className="text-lg font-bold text-gray-900">Could not load lineups</h3>
        <p className="text-sm text-gray-400 max-w-xs">{errorMsg}</p>
        <button
          onClick={() => setState("idle")}
          className="mt-2 text-sm font-semibold text-emerald-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Not available ─────────────────────────────────────────────────────────
  if (state === "unavailable") {
    if (match.status === "upcoming") {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <span className="text-4xl">📋</span>
          <h3 className="text-lg font-bold text-gray-900">Lineups not yet announced</h3>
          {countdown ? (
            <p className="text-sm text-gray-400">
              Expected in approximately{" "}
              <span className="font-semibold text-gray-700">{countdown}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400">Check back closer to kickoff</p>
          )}
          <p className="text-xs text-gray-300">
            Lineups are typically published ~1 hour before kickoff
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <span className="text-4xl">📋</span>
        <h3 className="text-lg font-bold text-gray-900">
          {match.status === "live" ? "Lineups not published yet" : "Lineup graphic unavailable"}
        </h3>
        <p className="text-sm text-gray-400 max-w-xs">
          {match.status === "live"
            ? "Official lineups haven't been released for this match yet."
            : "Detailed lineup data isn't available for this match, but you can still rate players and vote for POTG using the squad."}
        </p>
      </div>
    );
  }

  // ── Loaded ────────────────────────────────────────────────────────────────
  if (!lineups) return null;

  return (
    <div>
      <MatchPitch home={lineups.home} away={lineups.away} />
    </div>
  );
}
