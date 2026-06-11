"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { Match, LineupPlayer, SquadPlayer } from "@/types/database";

const POSITIONS: LineupPlayer["position"][] = ["GK", "DEF", "MID", "FWD"];

const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3", "5-3-2", "5-4-1", "4-5-1", "4-1-4-1"];

function defaultPlayers(): LineupPlayer[] {
  return Array.from({ length: 11 }, (_, i) => ({
    name: "",
    position: i === 0 ? "GK" : i < 5 ? "DEF" : i < 8 ? "MID" : "FWD",
    shirt_number: i + 1,
  }));
}

interface Props {
  match: Match;
  userId: string;
  teamCode: string;
  teamName: string;
  existingPlayers?: LineupPlayer[];
  locked: boolean;
}

export function LineupPredictionForm({ match, userId, teamCode, teamName, existingPlayers, locked }: Props) {
  const [players, setPlayers] = useState<LineupPlayer[]>(
    existingPlayers?.length ? existingPlayers : defaultPlayers()
  );
  const [formation, setFormation] = useState("4-3-3");
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [loadingSquad, setLoadingSquad] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch the 26-man squad for this team from Supabase
  useEffect(() => {
    async function fetchSquad() {
      setLoadingSquad(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("squads")
        .select("players")
        .eq("team_code", teamCode)
        .single();

      if (data?.players) {
        setSquad(data.players as SquadPlayer[]);
      }
      setLoadingSquad(false);
    }
    fetchSquad();
  }, [teamCode]);

  function updatePlayer(idx: number, field: keyof LineupPlayer, value: string) {
    setPlayers((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        if (field === "name") {
          // Auto-fill position + shirt number from squad when a player is selected
          const squadPlayer = squad.find((s) => s.name === value);
          if (squadPlayer) {
            return {
              ...p,
              name: value,
              position: squadPlayer.position,
              shirt_number: squadPlayer.shirtNumber ?? p.shirt_number,
            };
          }
        }
        return {
          ...p,
          [field]: field === "shirt_number" ? parseInt(value) || p.shirt_number : value,
        };
      })
    );
  }

  // Players already picked in other slots (to grey out / disable in dropdowns)
  const pickedNames = new Set(players.map((p) => p.name).filter(Boolean));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase.from("lineup_predictions").upsert(
      { user_id: userId, match_id: match.id, team_code: teamCode, players: players as any, formation },
      { onConflict: "user_id,match_id,team_code" }
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Group squad by position for the optgroup dropdown
  const squadByPos: Record<string, SquadPlayer[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of squad) {
    squadByPos[p.position]?.push(p);
  }
  // Sort each group by shirt number
  for (const pos of POSITIONS) {
    squadByPos[pos].sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99));
  }

  const posLabel: Record<string, string> = { GK: "Goalkeepers", DEF: "Defenders", MID: "Midfielders", FWD: "Forwards" };

  return (
    <form onSubmit={handleSubmit} className="bg-[#0d1f1a] rounded-xl p-4 space-y-3">
      {/* Header: team name + formation picker */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-white">{teamName} XI</h3>
        <select
          value={formation}
          onChange={(e) => setFormation(e.target.value)}
          disabled={locked}
          className="rounded border border-gray-600 bg-[#162920] text-white text-xs px-2 py-1"
        >
          {FORMATIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {loadingSquad && (
        <p className="text-xs text-gray-400 py-2 text-center">Loading squad…</p>
      )}

      {!loadingSquad && squad.length === 0 && (
        <p className="text-xs text-amber-400 py-2 text-center">
          Squad not yet available — squads are synced closer to the tournament.
        </p>
      )}

      {/* 11 player rows */}
      <div className="space-y-2">
        {players.map((player, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {/* Shirt number */}
            <span className="w-5 text-xs text-gray-500 text-right flex-shrink-0">
              {player.shirt_number}
            </span>

            {/* Position badge */}
            <select
              value={player.position}
              onChange={(e) => updatePlayer(idx, "position", e.target.value)}
              disabled={locked}
              className="w-[4.5rem] flex-shrink-0 rounded border border-gray-600 bg-[#162920] text-white text-xs px-1 py-1"
            >
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Player dropdown — squad names grouped by position */}
            {squad.length > 0 ? (
              <select
                value={player.name}
                onChange={(e) => updatePlayer(idx, "name", e.target.value)}
                disabled={locked}
                className="flex-1 rounded border border-gray-600 bg-[#162920] text-white text-xs px-2 py-1 min-w-0"
              >
                <option value="">— Pick a player —</option>
                {POSITIONS.map((pos) =>
                  squadByPos[pos].length > 0 ? (
                    <optgroup key={pos} label={posLabel[pos]}>
                      {squadByPos[pos].map((sp) => (
                        <option
                          key={sp.id}
                          value={sp.name}
                          disabled={pickedNames.has(sp.name) && sp.name !== player.name}
                        >
                          {sp.shirtNumber ? `${sp.shirtNumber}. ` : ""}{sp.name}
                          {pickedNames.has(sp.name) && sp.name !== player.name ? " ✓" : ""}
                        </option>
                      ))}
                    </optgroup>
                  ) : null
                )}
              </select>
            ) : (
              // Fallback free-text input when squad isn't loaded yet
              <input
                value={player.name}
                onChange={(e) => updatePlayer(idx, "name", e.target.value)}
                placeholder={`Player ${idx + 1}`}
                disabled={locked}
                className="flex-1 rounded border border-gray-600 bg-[#162920] text-white text-xs px-2 py-1.5 min-w-0 placeholder-gray-600"
              />
            )}
          </div>
        ))}
      </div>

      {!locked && (
        <Button
          type="submit"
          disabled={saving}
          className="w-full text-sm font-semibold"
          style={{ backgroundColor: "#1D9E75", color: "#fff" }}
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Lineup"}
        </Button>
      )}
    </form>
  );
}
