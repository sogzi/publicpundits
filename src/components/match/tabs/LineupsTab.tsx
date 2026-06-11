"use client";

import { PitchGrid, type PitchPlayer } from "@/components/match/PitchGrid";
import type { Match } from "@/types/database";

interface ConfirmedLineup {
  team_code: string;
  team_name: string;
  formation: string | null;
  start_xi: any;
  substitutes: any;
}

interface Props {
  match: Match;
  confirmedLineups: ConfirmedLineup[];
}

function useCountdown(kickoffIso: string) {
  const kickoff = new Date(kickoffIso);
  const announcedAt = new Date(kickoff.getTime() - 60 * 60 * 1000); // ~1h before
  const now = new Date();
  if (now >= announcedAt) return null;
  const diff = announcedAt.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function toSlots(startXI: any[]): PitchPlayer[] {
  return startXI.slice(0, 11).map((p: any) => ({
    name: p.name ?? p.player?.name ?? "",
    shirt: p.shirt_number ?? p.number ?? p.player?.shirtNumber ?? null,
    position: p.position ?? p.player?.position ?? "",
  }));
}

export function LineupsTab({ match, confirmedLineups }: Props) {
  const homeLineup = confirmedLineups.find((l) => l.team_code === match.home_team_code);
  const awayLineup = confirmedLineups.find((l) => l.team_code === match.away_team_code);
  const countdown  = useCountdown(match.kickoff_at);

  if (!homeLineup && !awayLineup) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <span className="text-4xl">📋</span>
        <h3 className="text-lg font-bold text-gray-900">Lineups not yet announced</h3>
        {countdown ? (
          <p className="text-sm text-gray-400">
            Expected in approximately <span className="font-semibold text-gray-700">{countdown}</span>
          </p>
        ) : (
          <p className="text-sm text-gray-400">Check back closer to kickoff</p>
        )}
        <p className="text-xs text-gray-300">Lineups typically published ~1 hour before kickoff</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Side-by-side formations label */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-400">{match.home_team}</p>
          <p className="text-lg font-black text-gray-900">{homeLineup?.formation ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">{match.away_team}</p>
          <p className="text-lg font-black text-gray-900">{awayLineup?.formation ?? "—"}</p>
        </div>
      </div>

      {/* Side-by-side pitches */}
      <div className="grid grid-cols-2 gap-3">
        {homeLineup ? (
          <PitchGrid
            formation={homeLineup.formation ?? "4-3-3"}
            players={toSlots(homeLineup.start_xi ?? [])}
            compact
          />
        ) : (
          <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center min-h-[200px]">
            <p className="text-xs text-gray-400">Not announced</p>
          </div>
        )}

        {awayLineup ? (
          <PitchGrid
            formation={awayLineup.formation ?? "4-3-3"}
            players={toSlots(awayLineup.start_xi ?? [])}
            flipped
            compact
          />
        ) : (
          <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center min-h-[200px]">
            <p className="text-xs text-gray-400">Not announced</p>
          </div>
        )}
      </div>

      {/* Substitutes bench */}
      {(homeLineup?.substitutes?.length > 0 || awayLineup?.substitutes?.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mt-2">
          {[homeLineup, awayLineup].map((lineup, i) => (
            <div key={i}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Substitutes</p>
              <div className="space-y-1">
                {(lineup?.substitutes ?? []).map((p: any, j: number) => (
                  <div key={j} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {p.shirt_number ?? p.number ?? p.player?.shirtNumber ?? ""}
                    </span>
                    <span className="truncate">{p.name ?? p.player?.name ?? "—"}</span>
                    <span className="text-gray-300 ml-auto flex-shrink-0">{p.position ?? p.player?.position ?? ""}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
