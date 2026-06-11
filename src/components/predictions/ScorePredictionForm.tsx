"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Match, ScorePrediction } from "@/types/database";

interface Props {
  match: Match;
  userId: string;
  existing?: ScorePrediction | null;
  locked: boolean;
}

export function ScorePredictionForm({ match, userId, existing, locked }: Props) {
  const [home, setHome] = useState(existing?.home_score?.toString() ?? "");
  const [away, setAway] = useState(existing?.away_score?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      user_id: userId,
      match_id: match.id,
      home_score: parseInt(home),
      away_score: parseInt(away),
    };
    if (existing) {
      await supabase.from("score_predictions").update({ home_score: payload.home_score, away_score: payload.away_score }).eq("id", existing.id);
    } else {
      await supabase.from("score_predictions").insert(payload);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Score Prediction</h3>
      <div className="flex items-center gap-3">
        <div className="flex-1 text-right">
          <p className="text-xs text-gray-500 mb-1">{match.home_team_code}</p>
          <Input
            type="number"
            min={0}
            max={20}
            value={home}
            onChange={(e) => setHome(e.target.value)}
            disabled={locked}
            className="text-center text-lg font-bold w-16 mx-auto"
            required
          />
        </div>
        <span className="text-gray-400 font-bold">–</span>
        <div className="flex-1 text-left">
          <p className="text-xs text-gray-500 mb-1">{match.away_team_code}</p>
          <Input
            type="number"
            min={0}
            max={20}
            value={away}
            onChange={(e) => setAway(e.target.value)}
            disabled={locked}
            className="text-center text-lg font-bold w-16 mx-auto"
            required
          />
        </div>
      </div>
      {!locked && (
        <Button type="submit" disabled={saving} className="w-full" size="sm">
          {saving ? "Saving…" : saved ? "Saved!" : existing ? "Update Prediction" : "Submit Prediction"}
        </Button>
      )}
      {locked && (
        <p className="text-xs text-center text-amber-600">Predictions locked</p>
      )}
    </form>
  );
}
