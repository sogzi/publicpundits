"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { FLAG } from "@/lib/fixtures-data";
import { Badge } from "@/components/ui/badge";
import type { Match } from "@/types/database";

const BRAND = "#1D9E75";

const STAGE_ORDER: Match["stage"][] = [
  "group", "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final",
];
const STAGE_LABEL: Record<Match["stage"], string> = {
  group: "Group Stage",
  round_of_32: "Round of 32",
  round_of_16: "Round of 16",
  quarter_final: "Quarter-finals",
  semi_final: "Semi-finals",
  third_place: "3rd Place Play-off",
  final: "Final",
};
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function formatKickoff(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(new Date(iso));
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap"
      style={
        active
          ? { backgroundColor: BRAND, color: "#fff", borderColor: BRAND }
          : { backgroundColor: "#fff", color: "#374151", borderColor: "#E5E7EB" }
      }
    >
      {children}
    </button>
  );
}

function MatchCard({ match }: { match: Match }) {
  const homeFlag = FLAG[match.home_team_code] ?? "🏳️";
  const awayFlag = FLAG[match.away_team_code] ?? "🏳️";
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";

  return (
    <Link
      href={`/match/${match.id}`}
      className="block rounded-xl border border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm transition-all p-4"
    >
      {/* top row: date + status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">{formatKickoff(match.kickoff_at)}</span>
        {isLive && <Badge variant="live">LIVE</Badge>}
        {isFinished && <Badge variant="secondary">FT</Badge>}
        {!isLive && !isFinished && (
          <span className="text-xs text-gray-400 font-medium">Upcoming</span>
        )}
      </div>

      {/* teams + score */}
      <div className="flex items-center gap-2">
        {/* home */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none">{homeFlag}</span>
          <span className="text-sm font-semibold text-gray-900 truncate">{match.home_team}</span>
        </div>

        {/* score / vs */}
        <div className="flex-shrink-0 text-center w-16">
          {isFinished || isLive ? (
            <span className="text-lg font-black text-gray-900">
              {match.home_score ?? "–"} – {match.away_score ?? "–"}
            </span>
          ) : (
            <span className="text-sm font-bold text-gray-300">vs</span>
          )}
        </div>

        {/* away */}
        <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-900 truncate text-right">{match.away_team}</span>
          <span className="text-xl leading-none">{awayFlag}</span>
        </div>
      </div>

      {/* venue */}
      {match.venue && (
        <p className="text-xs text-gray-400 mt-2 truncate">{match.venue}</p>
      )}
    </Link>
  );
}

interface Props {
  matches: Match[];
}

export function FixturesClient({ matches }: Props) {
  const [stageFilter, setStageFilter] = useState<Match["stage"] | "all">("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (stageFilter !== "all" && m.stage !== stageFilter) return false;
      if (groupFilter !== "all") {
        if (m.stage !== "group") return false;
        if (m.group_name !== groupFilter) return false;
      }
      return true;
    });
  }, [matches, stageFilter, groupFilter]);

  const grouped = useMemo(() => {
    const map: Partial<Record<Match["stage"], Match[]>> = {};
    for (const m of filtered) {
      map[m.stage] = [...(map[m.stage] ?? []), m];
    }
    return map;
  }, [filtered]);

  const showGroupFilter = stageFilter === "all" || stageFilter === "group";

  return (
    <div>
      {/* ── Filter bar ── */}
      <div className="sticky top-14 z-40 bg-white border-b border-gray-100 py-3 -mx-4 px-4 mb-6">
        <div className="space-y-2">
          {/* Round filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <FilterPill active={stageFilter === "all"} onClick={() => { setStageFilter("all"); setGroupFilter("all"); }}>
              All
            </FilterPill>
            {STAGE_ORDER.map((s) => (
              <FilterPill
                key={s}
                active={stageFilter === s}
                onClick={() => { setStageFilter(s); setGroupFilter("all"); }}
              >
                {STAGE_LABEL[s]}
              </FilterPill>
            ))}
          </div>

          {/* Group filter — only visible when group stage is in scope */}
          {showGroupFilter && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <FilterPill active={groupFilter === "all"} onClick={() => setGroupFilter("all")}>
                All groups
              </FilterPill>
              {GROUPS.map((g) => (
                <FilterPill
                  key={g}
                  active={groupFilter === g}
                  onClick={() => { setGroupFilter(g); setStageFilter("group"); }}
                >
                  Group {g}
                </FilterPill>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Match list grouped by round ── */}
      <div className="space-y-10">
        {STAGE_ORDER.filter((s) => grouped[s]?.length).map((stage) => (
          <section key={stage}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                {STAGE_LABEL[stage]}
              </h2>
              <span className="h-px flex-1 bg-gray-100" />
              <span className="text-xs text-gray-400">{grouped[stage]!.length} matches</span>
            </div>

            {/* For group stage, sub-group by group letter */}
            {stage === "group" ? (
              <div className="space-y-6">
                {GROUPS.filter((g) => grouped.group?.some((m) => m.group_name === g)).map((g) => {
                  const gMatches = grouped.group!.filter((m) => m.group_name === g);
                  return (
                    <div key={g}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                        Group {g}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {gMatches.map((m) => <MatchCard key={m.id} match={m} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[stage]!.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
            )}
          </section>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-16 text-sm">No fixtures match your filter.</p>
        )}
      </div>
    </div>
  );
}
