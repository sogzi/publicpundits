"use client";

/**
 * PitchGrid — renders players on a green football pitch.
 *
 * Layout: GK at bottom, then outfield rows stacked upward (home team).
 * For the away team, pass `flipped` to mirror the layout.
 *
 * formation: "4-3-3" → rows [4,3,3] (+GK = [1,4,3,3])
 * players: array of 11, ordered GK → DEF → MID → FWD
 */

import { useState } from "react";
import type { SquadPlayer } from "@/types/database";

export interface PitchPlayer {
  name: string;
  shirt: number | null;
  position: string;
}

interface Props {
  formation: string;
  players: (PitchPlayer | null)[];   // 11 slots, null = empty
  editable?: boolean;
  squad?: SquadPlayer[];
  onPickPlayer?: (slotIndex: number, player: SquadPlayer) => void;
  flipped?: boolean;                 // away team: flip vertically
  compact?: boolean;                 // smaller font for side-by-side view
}

function parseFormation(f: string): number[] {
  const parts = f.split("-").map(Number).filter((n) => !isNaN(n) && n > 0);
  return parts.length >= 2 ? [1, ...parts] : [1, 4, 3, 3]; // GK + outfield rows
}

const BRAND = "#1D9E75";

export function PitchGrid({ formation, players, editable, squad = [], onPickPlayer, flipped, compact }: Props) {
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const rows = parseFormation(formation);

  // Assign each row its slice of players
  let cursor = 0;
  const rowSlices: { rowPlayers: (PitchPlayer | null)[]; startIdx: number }[] = [];
  for (const count of rows) {
    rowSlices.push({ rowPlayers: players.slice(cursor, cursor + count), startIdx: cursor });
    cursor += count;
  }

  // Flip order for away team
  const displayRows = flipped ? [...rowSlices].reverse() : rowSlices;

  // Squad grouped by position for dropdown
  const byPos: Record<string, SquadPlayer[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of squad) byPos[p.position]?.push(p);

  const pickedNames = new Set(players.filter(Boolean).map((p) => p!.name));

  const dotSize = compact ? "w-10 h-10 text-[9px]" : "w-14 h-14 text-xs";
  const nameSize = compact ? "text-[8px] leading-tight" : "text-[10px] leading-tight";

  return (
    <div
      className="relative rounded-xl overflow-hidden w-full select-none"
      style={{ background: "linear-gradient(180deg, #1a6b35 0%, #1e7a3e 50%, #1a6b35 100%)", minHeight: compact ? 220 : 320 }}
    >
      {/* Pitch markings */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Centre line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
        {/* Centre circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20" />
        {/* Penalty boxes */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-1/4 border border-white/15 border-b-0" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1/4 border border-white/15 border-t-0" />
      </div>

      {/* Player rows — no z-index here so dropdown z-50 is evaluated in the global context, above the z-40 backdrop */}
      <div className={`relative flex flex-col justify-around h-full py-3 ${compact ? "gap-1" : "gap-2"}`}>
        {displayRows.map(({ rowPlayers, startIdx }, rowIdx) => (
          <div key={rowIdx} className="flex justify-around items-center px-2">
            {rowPlayers.map((player, colIdx) => {
              const globalIdx = startIdx + colIdx;
              const isEmpty = !player?.name;
              return (
                <div key={colIdx} className="flex flex-col items-center gap-0.5 relative">
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={(e) => { e.stopPropagation(); editable && setOpenSlot(openSlot === globalIdx ? null : globalIdx); }}
                    className={`${dotSize} rounded-full border-2 flex flex-col items-center justify-center font-bold transition-all ${
                      editable ? "cursor-pointer hover:scale-110 active:scale-95" : "cursor-default"
                    } ${isEmpty
                      ? "bg-white/10 border-white/30 text-white/50"
                      : "text-white border-white/60"
                    }`}
                    style={!isEmpty ? { backgroundColor: BRAND } : undefined}
                  >
                    {!isEmpty && (
                      <>
                        <span className="leading-none font-black">{player!.shirt ?? ""}</span>
                      </>
                    )}
                    {isEmpty && editable && <span className="text-white/50 text-lg leading-none">+</span>}
                  </button>
                  <span className={`${nameSize} text-white/90 text-center max-w-[60px] truncate font-medium drop-shadow`}>
                    {player?.name ? player.name.split(" ").slice(-1)[0] : (editable ? "Pick" : "?")}
                  </span>

                  {/* Dropdown for editable slots */}
                  {editable && openSlot === globalIdx && (
                    <div className="absolute top-full mt-1 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 w-48 max-h-64 overflow-y-auto left-1/2 -translate-x-1/2">
                      {["GK", "DEF", "MID", "FWD"].map((pos) =>
                        byPos[pos]?.length ? (
                          <div key={pos}>
                            <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 sticky top-0">
                              {pos}
                            </p>
                            {byPos[pos].map((sp) => (
                              <button
                                key={sp.id}
                                type="button"
                                disabled={pickedNames.has(sp.name) && sp.name !== player?.name}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPickPlayer?.(globalIdx, sp);
                                  setOpenSlot(null);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-emerald-50 transition-colors ${
                                  pickedNames.has(sp.name) && sp.name !== player?.name
                                    ? "text-gray-300 cursor-not-allowed"
                                    : sp.name === player?.name
                                    ? "bg-emerald-50 font-semibold text-emerald-700"
                                    : "text-gray-700"
                                }`}
                              >
                                {sp.shirtNumber ? `${sp.shirtNumber}. ` : ""}{sp.name}
                              </button>
                            ))}
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Close dropdowns on backdrop click */}
      {openSlot !== null && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenSlot(null)} />
      )}
    </div>
  );
}
