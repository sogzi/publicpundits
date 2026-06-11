"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Match, LineupPlayer } from "@/types/database";

const POSITIONS: LineupPlayer["position"][] = ["GK", "DEF", "MID", "FWD"];
const DEFAULT_PLAYERS: LineupPlayer[] = Array.from({ length: 11 }, (_, i) => ({
  name: "",
  position: i === 0 ? "GK" : i < 5 ? "DEF" : i < 8 ? "MID" : "FWD",
  shirt_number: i + 1,
}));

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
    existingPlayers?.length ? existingPlayers : DEFAULT_PLAYERS
  );
  const [formation, setFormation] = useState("4-3-3");
  const [saving, setSaving] = useState(false);

  function updatePlayer(idx: number, field: keyof LineupPlayer, value: string) {
    setPlayers((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: field === "shirt_number" ? parseInt(value) : value } : p));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase.from("lineup_predictions").upsert({
      user_id: userId,
      match_id: match.id,
      team_code: teamCode,
      players: players as any,
      formation,
    }, { onConflict: "user_id,match_id,team_code" });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{teamName} XI</h3>
        <Input
          value={formation}
          onChange={(e) => setFormation(e.target.value)}
          className="w-24 text-center text-sm"
          placeholder="4-3-3"
          disabled={locked}
        />
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {players.map((player, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-6 text-xs text-gray-400 text-right">{player.shirt_number}</span>
            <select
              value={player.position}
              onChange={(e) => updatePlayer(idx, "position", e.target.value)}
              disabled={locked}
              className="w-16 rounded border border-gray-300 text-xs px-1 py-1 dark:bg-gray-900 dark:border-gray-700"
            >
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <Input
              value={player.name}
              onChange={(e) => updatePlayer(idx, "name", e.target.value)}
              placeholder={`Player ${idx + 1}`}
              disabled={locked}
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>
      {!locked && (
        <Button type="submit" disabled={saving} size="sm" className="w-full">
          {saving ? "Saving…" : "Save Lineup"}
        </Button>
      )}
    </form>
  );
}
