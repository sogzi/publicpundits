"use client";

/**
 * PitchGrid — interactive lineup predictor pitch.
 *
 * Empty slot  → shirt icon + "Pick player" label
 * Filled slot → green circle with shirt number + last name below + clear ×
 * Player picker → fixed centred modal, grouped by position, already-picked greyed out
 */

import { useState } from "react";
import type { SquadPlayer } from "@/types/database";

export interface PitchPlayer {
  name:     string;
  shirt:    number | null;
  position: string;
}

interface Props {
  formation:     string | null | undefined;
  players:       (PitchPlayer | null)[];
  editable?:     boolean;
  squad?:        SquadPlayer[];
  onPickPlayer?: (slotIndex: number, player: SquadPlayer) => void;
  onClearSlot?:  (slotIndex: number) => void;
  flipped?:      boolean;
  compact?:      boolean;
}

function parseFormation(f: string | null | undefined): number[] {
  if (!f) return [1, 4, 3, 3];
  const parts = f.split("-").map(Number).filter((n) => !isNaN(n) && n > 0);
  return parts.length >= 2 ? [1, ...parts] : [1, 4, 3, 3];
}

const BRAND    = "#1D9E75";
const BRAND_DK = "#157a5a";

const POS_LABEL: Record<string, string> = {
  GK: "Goalkeepers", DEF: "Defenders", MID: "Midfielders", FWD: "Forwards",
};

// ─── Shirt SVG icon ───────────────────────────────────────────────────────────
function ShirtIcon({ size = 20, color = "rgba(255,255,255,0.5)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2L22 6L19 9L17 7V20H7V7L5 9L2 6L8 2C8 3.1 9.8 4 12 4C14.2 4 16 3.1 16 2Z" />
    </svg>
  );
}

// ─── Player picker modal ──────────────────────────────────────────────────────
interface PickerProps {
  slotIndex:   number;
  currentName: string | undefined;
  byPos:       Record<string, SquadPlayer[]>;
  pickedNames: Set<string>;
  onPick:      (sp: SquadPlayer) => void;
  onClose:     () => void;
}

function PlayerPickerModal({ currentName, byPos, pickedNames, onPick, onClose }: PickerProps) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[min(380px,92vw)] bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "72vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0 gap-3">
          <span className="text-sm font-bold text-gray-900 flex-shrink-0">Select a player</span>
          <input
            autoFocus
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400 text-gray-900"
          />
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-base leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Scrollable list */}
        <div
          className="overflow-y-auto flex-1 pb-2"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {["GK", "DEF", "MID", "FWD"].map((pos) => {
            const group = (byPos[pos] ?? []).filter(
              (sp) => !q || sp.name.toLowerCase().includes(q) || String(sp.shirtNumber).includes(q)
            );
            if (!group.length) return null;
            return (
              <div key={pos}>
                {/* Section header */}
                <div className="sticky top-0 bg-gray-50 border-b border-gray-100 px-4 py-1.5 z-10">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {POS_LABEL[pos]}
                  </span>
                </div>

                {group.map((sp) => {
                  const isPicked   = pickedNames.has(sp.name) && sp.name !== currentName;
                  const isSelected = sp.name === currentName;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      disabled={isPicked}
                      onClick={(e) => { e.stopPropagation(); onPick(sp); }}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors
                        ${isPicked   ? "opacity-30 cursor-not-allowed" : "hover:bg-emerald-50 active:bg-emerald-100"}
                        ${isSelected ? "bg-emerald-50" : ""}
                      `}
                    >
                      {/* Shirt number badge */}
                      <span
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
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
                        <span className="block text-[10px] text-gray-400 font-medium uppercase tracking-wide">{pos}</span>
                      </span>

                      {isSelected && <span className="text-emerald-500 font-bold text-sm flex-shrink-0">✓</span>}
                      {isPicked   && <span className="text-gray-300 text-[10px] flex-shrink-0 font-medium">In XI</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* No results */}
          {q && !["GK", "DEF", "MID", "FWD"].some((pos) =>
            (byPos[pos] ?? []).some((sp) => sp.name.toLowerCase().includes(q))
          ) && (
            <p className="text-center text-sm text-gray-400 py-8">No players match "{search}"</p>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main PitchGrid ───────────────────────────────────────────────────────────
export function PitchGrid({
  formation, players, editable, squad = [],
  onPickPlayer, onClearSlot, flipped, compact,
}: Props) {
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
  for (const pos of ["GK", "DEF", "MID", "FWD"]) {
    byPos[pos].sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99));
  }

  const pickedNames = new Set(
    players.filter(Boolean).map((p) => p!.name).filter(Boolean)
  );

  const slotSize  = compact ? "w-11 h-11" : "w-14 h-14";
  const nameSize  = compact ? "text-[8px]" : "text-[10px]";
  const openPlayer = openSlot !== null ? players[openSlot] : null;

  return (
    <>
      <div
        className="relative rounded-xl overflow-hidden w-full select-none"
        style={{
          background: "linear-gradient(180deg, #1a6b35 0%, #1e7a3e 50%, #1a6b35 100%)",
          minHeight: compact ? 220 : 340,
        }}
      >
        {/* Pitch markings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-1/4 border border-white/15 border-b-0" />
          <div className="absolute top-0    left-1/2 -translate-x-1/2 w-2/3 h-1/4 border border-white/15 border-t-0" />
        </div>

        {/* Player rows */}
        <div className={`relative flex flex-col justify-around h-full py-3 ${compact ? "gap-1" : "gap-2"}`}>
          {displayRows.map(({ rowPlayers, startIdx }, rowIdx) => (
            <div key={rowIdx} className="flex justify-around items-center px-1">
              {rowPlayers.map((player, colIdx) => {
                const globalIdx = startIdx + colIdx;
                const isFilled  = !!player?.name;
                const isOpen    = openSlot === globalIdx;

                return (
                  <div key={colIdx} className="flex flex-col items-center gap-0.5 relative">
                    {/* Clear button — top-right of slot */}
                    {editable && isFilled && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearSlot?.(globalIdx);
                        }}
                        className="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow transition-colors"
                        title="Clear player"
                      >
                        ×
                      </button>
                    )}

                    {/* Slot circle */}
                    <button
                      type="button"
                      disabled={!editable}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!editable) return;
                        setOpenSlot(isOpen ? null : globalIdx);
                      }}
                      className={`${slotSize} rounded-full border-2 flex flex-col items-center justify-center font-bold transition-all
                        ${editable ? "cursor-pointer hover:scale-110 active:scale-95" : "cursor-default"}
                      `}
                      style={
                        isFilled
                          ? { backgroundColor: isOpen ? BRAND_DK : BRAND, borderColor: "rgba(255,255,255,0.7)", color: "#fff" }
                          : isOpen
                          ? { backgroundColor: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.9)", color: "#fff" }
                          : { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.5)" }
                      }
                    >
                      {isFilled ? (
                        <span className={`leading-none font-black ${compact ? "text-sm" : "text-base"}`}>
                          {player!.shirt ?? "#"}
                        </span>
                      ) : (
                        <ShirtIcon size={compact ? 16 : 20} color={isOpen ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)"} />
                      )}
                    </button>

                    {/* Player name / pick label */}
                    <span className={`${nameSize} text-center font-medium drop-shadow leading-tight`}
                      style={{ color: isFilled ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)", maxWidth: compact ? 44 : 56 }}
                    >
                      {isFilled
                        ? player!.name.split(" ").slice(-1)[0]   // surname only
                        : editable ? "Pick" : "?"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Player picker modal — outside pitch so overflow-hidden doesn't clip it */}
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
