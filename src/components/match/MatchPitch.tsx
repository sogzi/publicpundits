"use client";

/**
 * MatchPitch — full portrait pitch showing both teams facing each other.
 *
 * Layout (top → bottom):
 *   Away GK at top edge
 *   Away DEF rows …
 *   Away MID rows …
 *   Away FWD rows  ← just above centre line
 *   ──────────────── centre line
 *   Home FWD rows  ← just below centre line
 *   Home MID rows …
 *   Home DEF rows …
 *   Home GK at bottom edge
 *
 * Player positioning is derived from the `grid` field returned by API-Sports
 * ("row:col", e.g. "2:3").  If grid is absent, we fall back to evenly-spacing
 * players inside each row using the formation string.
 */

export interface PitchPlayerData {
  name:    string;
  shirt:   number | null;
  pos:     string;    // "GK" | "DEF" | "MID" | "FWD"
  grid:    string | null;  // "row:col" from API-Sports, null for subs
  starter: boolean;
}

interface TeamData {
  teamName:  string;
  teamCode:  string;
  formation: string;
  starters:  PitchPlayerData[];
  subs:      PitchPlayerData[];
}

interface Props {
  home: TeamData;
  away: TeamData;
}

const BRAND = "#1D9E75";

// ─────────────────────────────────────────────────────────────────────────────
// Positioning helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Parse "4-3-3" → [1, 4, 3, 3] (GK + outfield rows) */
function parseFormation(f: string): number[] {
  const parts = f.split("-").map(Number).filter((n) => !isNaN(n) && n > 0);
  return parts.length >= 2 ? [1, ...parts] : [1, 4, 3, 3];
}

/**
 * Assign players to rows using their grid field ("row:col") if present.
 * Falls back to sequential assignment from the formation array.
 */
function assignRows(players: PitchPlayerData[], formation: string): PitchPlayerData[][] {
  const rowSizes = parseFormation(formation);
  const totalRows = rowSizes.length;

  // Build empty rows
  const rows: (PitchPlayerData | null)[][] = rowSizes.map((n) => Array(n).fill(null));

  // Try to place by grid
  const gridPlaced = new Set<string>();
  for (const p of players) {
    if (!p.grid) continue;
    const [rStr, cStr] = p.grid.split(":");
    const r = parseInt(rStr) - 1; // 0-indexed
    const c = parseInt(cStr) - 1;
    if (r >= 0 && r < totalRows && c >= 0 && c < rowSizes[r]) {
      rows[r][c] = p;
      gridPlaced.add(p.name);
    }
  }

  // Sequential fallback for any player without a valid grid
  let cursor = 0;
  for (const p of players) {
    if (gridPlaced.has(p.name)) continue;
    while (cursor < totalRows) {
      const slot = rows[cursor].findIndex((s) => s === null);
      if (slot !== -1) {
        rows[cursor][slot] = p;
        break;
      }
      cursor++;
    }
  }

  return rows.map((r) => r.filter((p): p is PitchPlayerData => p !== null));
}

/**
 * Compute vertical (y%) position for a row within the team's half.
 *
 * isHome=true  → rows go from bottom (GK) to top (FWD, just below centre).
 * isHome=false → rows go from top (GK) to bottom (FWD, just above centre).
 *
 * Available band: 10%–47% (away) or 53%–90% (home) of total pitch height.
 */
function rowY(rowIndex: number, totalRows: number, isHome: boolean): number {
  // normalised 0..1 within the team's half (0=GK edge, 1=attacking third)
  const t = totalRows === 1 ? 0.5 : rowIndex / (totalRows - 1);

  if (isHome) {
    // GK at ~90%, FWDs at ~54%
    return 90 - t * 36;
  } else {
    // GK at ~10%, FWDs at ~46%
    return 10 + t * 36;
  }
}

/** Compute horizontal (x%) positions for N players spread evenly across pitch width */
function rowXPositions(n: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [50];
  return Array.from({ length: n }, (_, i) => {
    // Spread with a small margin on each side
    const margin = Math.max(8, 44 / n);
    return margin + ((100 - 2 * margin) / (n - 1)) * i;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function PlayerDot({
  player, x, y, size,
}: {
  player: PitchPlayerData;
  x: number;
  y: number;
  size: "sm" | "md";
}) {
  const dotCls  = size === "sm" ? "w-8 h-8 text-[10px]"  : "w-10 h-10 text-xs";
  const nameCls = size === "sm" ? "text-[7px] max-w-[44px]" : "text-[8px] max-w-[52px]";
  const lastName = player.name.split(" ").slice(-1)[0];

  return (
    <div
      className="absolute flex flex-col items-center gap-0.5"
      style={{
        left:      `${x}%`,
        top:       `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className={`${dotCls} rounded-full border-2 border-white/70 flex flex-col items-center justify-center font-black text-white shadow-md`}
        style={{ backgroundColor: BRAND }}
      >
        <span className="leading-none">{player.shirt ?? ""}</span>
      </div>
      <span
        className={`${nameCls} text-white font-semibold text-center leading-tight drop-shadow truncate`}
      >
        {lastName}
      </span>
    </div>
  );
}

function SubsBench({ players, teamName }: { players: PitchPlayerData[]; teamName: string }) {
  if (!players.length) return null;
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
        {teamName} substitutes
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold flex-shrink-0 text-gray-700">
              {p.shirt ?? ""}
            </span>
            <span className="truncate">{p.name}</span>
            <span className="text-gray-300 ml-auto flex-shrink-0 text-[10px]">{p.pos}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function MatchPitch({ home, away }: Props) {
  const homeRows = assignRows(home.starters, home.formation);
  const awayRows = assignRows(away.starters, away.formation);

  return (
    <div className="space-y-5">
      {/* Formation badges */}
      <div className="flex justify-between items-center px-1">
        <div className="text-center">
          <p className="text-xs text-gray-500 font-medium">{home.teamName}</p>
          <p className="text-xl font-black text-gray-900">{home.formation}</p>
        </div>
        <span className="text-xs text-gray-300 font-medium">vs</span>
        <div className="text-center">
          <p className="text-xs text-gray-500 font-medium">{away.teamName}</p>
          <p className="text-xl font-black text-gray-900">{away.formation}</p>
        </div>
      </div>

      {/* Pitch */}
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          paddingBottom: "145%",   // portrait aspect ratio
          background: "linear-gradient(180deg, #1a6b35 0%, #21863f 30%, #236e38 50%, #21863f 70%, #1a6b35 100%)",
        }}
      >
        {/* ── Pitch markings ── */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Outline */}
          <div className="absolute inset-[3%] border border-white/20 rounded" />
          {/* Centre line */}
          <div className="absolute top-1/2 left-[3%] right-[3%] h-px bg-white/25" />
          {/* Centre circle */}
          <div
            className="absolute border border-white/20 rounded-full"
            style={{ width: "25%", aspectRatio: "1", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
          />
          {/* Centre spot */}
          <div
            className="absolute w-1.5 h-1.5 rounded-full bg-white/30"
            style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
          />
          {/* Home penalty box */}
          <div
            className="absolute border border-white/15 border-b-0"
            style={{ bottom: "3%", left: "20%", right: "20%", height: "16%" }}
          />
          {/* Home six-yard box */}
          <div
            className="absolute border border-white/10 border-b-0"
            style={{ bottom: "3%", left: "35%", right: "35%", height: "7%" }}
          />
          {/* Away penalty box */}
          <div
            className="absolute border border-white/15 border-t-0"
            style={{ top: "3%", left: "20%", right: "20%", height: "16%" }}
          />
          {/* Away six-yard box */}
          <div
            className="absolute border border-white/10 border-t-0"
            style={{ top: "3%", left: "35%", right: "35%", height: "7%" }}
          />
        </div>

        {/* ── Away players (top half) ── */}
        {awayRows.map((rowPlayers, rowIdx) => {
          const y = rowY(rowIdx, awayRows.length, false);
          const xs = rowXPositions(rowPlayers.length);
          return rowPlayers.map((player, colIdx) => (
            <PlayerDot
              key={`away-${rowIdx}-${colIdx}`}
              player={player}
              x={xs[colIdx]}
              y={y}
              size="sm"
            />
          ));
        })}

        {/* ── Home players (bottom half) ── */}
        {homeRows.map((rowPlayers, rowIdx) => {
          const y = rowY(rowIdx, homeRows.length, true);
          const xs = rowXPositions(rowPlayers.length);
          return rowPlayers.map((player, colIdx) => (
            <PlayerDot
              key={`home-${rowIdx}-${colIdx}`}
              player={player}
              x={xs[colIdx]}
              y={y}
              size="sm"
            />
          ));
        })}

        {/* Team name labels */}
        <div
          className="absolute text-white/50 font-bold text-[10px] uppercase tracking-widest"
          style={{ bottom: "3.5%", right: "4%" }}
        >
          {home.teamCode}
        </div>
        <div
          className="absolute text-white/50 font-bold text-[10px] uppercase tracking-widest"
          style={{ top: "3.5%", left: "4%" }}
        >
          {away.teamCode}
        </div>
      </div>

      {/* Substitutes */}
      <div className="grid grid-cols-2 gap-6 pt-2">
        <SubsBench players={home.subs} teamName={home.teamName} />
        <SubsBench players={away.subs} teamName={away.teamName} />
      </div>
    </div>
  );
}
