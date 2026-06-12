"use client";

/**
 * PitchGrid — renders players on a green football pitch.
 *
 * Layout: GK at bottom, then outfield rows stacked upward (home team).
 * For the away team, pass `flipped` to mirror the layout.
 *
 * formation: "4-3-3" → rows [4,3,3] (+GK = [1,4,3,3])
 * players: array of 11, ordered GK → DEF → MID → FWD
 *
 * Player picker: fixed-position centred modal (not relative to slot),
 * fully scrollable with iOS touch scrolling, grouped by position.
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
  players: (PitchPlayer | null)[];
  editable?: boolean;
  squad?: SquadPlayer[];
  onPickPlayer?: (slotIndex: number, player: SquadPlayer) => void;
  flipped?: boolean;
  compact?: boolean;
}

function parseFormation(f: string | null | undefined): number[] {
  if (!f) return [1, 4, 3, 3];
  const parts = f.split("-").map(Number).filter((n) => !isNaN(n) && n > 0);
  return parts.length >= 2 ? [1, ...parts] : [1, 4, 3, 3];
}

const BRAND = "#1D9E75";

const POS_LABEL: Record<string, string> = {
  GK:  "Goalkeepers",
  DEF: "Defenders",
  MID: "Midfielders",
  FWD: "Forwards",
};

// ─────────────────────────────────────────────────────────────────────────────
// Player picker modal — fixed centred on screen, fully scrollable
// ─────────────────────────────────────────────────────────────────────────────

interface PickerProps {
  slotIndex: number;
  currentName: string | undefined;
  byPos: Record<string, SquadPlayer[]>;
  pickedNames: Set<string>;
  onPick: (sp: SquadPlayer) => void;
  onClose: () => void;
}

function PlayerPickerModal({ slotIndex, currentName, byPos, pickedNames, onPick, onClose }: PickerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
      />

      {/* Modal — centred, max 90vw × 70vh */}
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[min(360px,90vw)] bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "70vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <span className="text-sm font-bold text-gray-900">Select a player</span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none font-bold px-1"
          >
            ×
          </button>
        </div>

        {/* Scrollable player list */}
        <div
          className="overflow-y-auto flex-1"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {["GK", "DEF", "MID", "FWD"].map((pos) =>
            byPos[pos]?.length ? (
              <div key={pos}>
                {/* Section header */}
                <div className="sticky top-0 bg-gray-50 border-b border-gray-100 px-4 py-1.5 z-10">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {POS_LABEL[pos]}
                  </span>
                </div>

                {byPos[pos].map((sp) => {
                  const isPicked  = pickedNames.has(sp.name) && sp.name !== currentName;
                  const isSelected = sp.name === currentName;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      disabled={isPicked}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPick(sp);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors
                        ${isPicked   ? "opacity-30 cursor-not-allowed" : "hover:bg-emerald-50 active:bg-emerald-100"}
                        ${isSelected ? "bg-emerald-50" : ""}
                      `}
                    >
                      {/* Shirt number badge */}
                      <span
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                        style={
                          isSelected
                            ? { backgroundColor: BRAND, color: "#fff" }
                            : { backgroundColor: "#F3F4F6", color: "#374151" }
                        }
                      >
                        {sp.shirtNumber ?? "—"}
                      </span>

                      {/* Name + position */}
                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm font-semibold truncate ${isSelected ? "text-emerald-700" : "text-gray-900"}`}>
                          {sp.name}
                        </span>
                        <span className="block text-[10px] text-gray-400 font-medium">{pos}</span>
                      </span>

                      {/* Checkmark if already selected in this slot */}
                      {isSelected && (
                        <span className="text-emerald-600 font-bold text-sm flex-shrink-0">✓</span>
                      )}
                      {/* Already used indicator */}
                      {isPicked && (
                        <span className="text-gray-300 text-xs flex-shrink-0">In XI</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PitchGrid
// ─────────────────────────────────────────────────────────────────────────────

export function PitchGrid({ formation, players, editable, squad = [], onPickPlayer, flipped, compact }: Props) {
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const rows = parseFormation(formation);

  let cursor = 0;
  const rowSlices: { rowPlayers: (PitchPlayer | null)[]; startIdx: number }[] = [];
  for (const count of rows) {
    rowSlices.push({ rowPlayers: players.slice(cursor, cursor + count), startIdx: cursor });
    cursor += count;
  }

  const displayRows = flipped ? [...rowSlices].reverse() : rowSlices;

  const byPos: Record<string, SquadPlayer[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of squad) byPos[p.position]?.push(p);
  // Sort each group by shirt number
  for (const pos of ["GK", "DEF", "MID", "FWD"]) {
    byPos[pos].sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99));
  }

  const pickedNames = new Set(players.filter(Boolean).map((p) => p!.name).filter(Boolean));

  const dotSize  = compact ? "w-10 h-10 text-[9px]" : "w-14 h-14 text-xs";
  const nameSize = compact ? "text-[8px] leading-tight" : "text-[10px] leading-tight";

  const openPlayer = openSlot !== null ? players[openSlot] : null;

  return (
    <>
      <div
        className="relative rounded-xl overflow-hidden w-full select-none"
        style={{
          background: "linear-gradient(180deg, #1a6b35 0%, #1e7a3e 50%, #1a6b35 100%)",
          minHeight: compact ? 220 : 320,
        }}
      >
        {/* Pitch markings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-1/4 border border-white/15 border-b-0" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1/4 border border-white/15 border-t-0" />
        </div>

        {/* Player rows */}
        <div className={`relative flex flex-col justify-around h-full py-3 ${compact ? "gap-1" : "gap-2"}`}>
          {displayRows.map(({ rowPlayers, startIdx }, rowIdx) => (
            <div key={rowIdx} className="flex justify-around items-center px-2">
              {rowPlayers.map((player, colIdx) => {
                const globalIdx = startIdx + colIdx;
                const isEmpty   = !player?.name;
                const isOpen    = openSlot === globalIdx;

                return (
                  <div key={colIdx} className="flex flex-col items-center gap-0.5">
                    <button
                      type="button"
                      disabled={!editable}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!editable) return;
                        setOpenSlot(isOpen ? null : globalIdx);
                      }}
                      className={`${dotSize} rounded-full border-2 flex flex-col items-center justify-center font-bold transition-all ${
                        editable ? "cursor-pointer hover:scale-110 active:scale-95" : "cursor-default"
                      } ${isEmpty
                        ? "bg-white/10 border-white/30 text-white/50"
                        : "text-white border-white/60"
                      }`}
                      style={
                        !isEmpty
                          ? { backgroundColor: isOpen ? "#157a5a" : BRAND }
                          : isOpen
                          ? { backgroundColor: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.7)" }
                          : undefined
                      }
                    >
                      {!isEmpty && (
                        <span className="leading-none font-black">{player!.shirt ?? ""}</span>
                      )}
                      {isEmpty && editable && (
                        <span className="text-white/70 text-lg leading-none">{isOpen ? "×" : "+"}</span>
                      )}
                    </button>
                    <span className={`${nameSize} text-white/90 text-center max-w-[60px] truncate font-medium drop-shadow`}>
                      {player?.name
                        ? player.name.split(" ").slice(-1)[0]
                        : editable ? "Pick" : "?"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Player picker modal — rendered outside the pitch so overflow-hidden doesn't clip it */}
      {editable && openSlot !== null && (
        <PlayerPickerModal
          slotIndex={openSlot}
          currentName={openPlayer?.name}
          byPos={byPos}
          pickedNames={pickedNames}
          onPick={(sp) => {
            onPickPlayer?.(openSlot, sp);
            setOpenSlot(null);
          }}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </>
  );
}
