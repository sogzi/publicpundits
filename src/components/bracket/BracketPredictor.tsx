"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BRACKET_ROUNDS = [
  { key: "round_of_16", label: "Round of 16", slots: 8 },
  { key: "quarter_final", label: "Quarter-finals", slots: 4 },
  { key: "semi_final", label: "Semi-finals", slots: 2 },
  { key: "final", label: "Final", slots: 1 },
];

interface BracketSlot {
  home: string;
  away: string;
  winner: string;
}

type BracketState = Record<string, BracketSlot[]>;

interface Props {
  userId: string;
  existing?: BracketState | null;
}

export function BracketPredictor({ userId, existing }: Props) {
  const [bracket, setBracket] = useState<BracketState>(
    existing ?? Object.fromEntries(BRACKET_ROUNDS.map((r) => [r.key, Array(r.slots).fill({ home: "", away: "", winner: "" })]))
  );
  const [tournamentWinner, setTournamentWinner] = useState(
    (existing as any)?.winner ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateSlot(round: string, idx: number, field: keyof BracketSlot, value: string) {
    setBracket((prev) => ({
      ...prev,
      [round]: prev[round].map((slot, i) => i === idx ? { ...slot, [field]: value } : slot),
    }));
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("bracket_predictions").upsert({
      user_id: userId,
      bracket: { ...bracket, winner: tournamentWinner },
    }, { onConflict: "user_id" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      {BRACKET_ROUNDS.map((round) => (
        <Card key={round.key}>
          <CardHeader>
            <CardTitle className="text-base">{round.label}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {bracket[round.key]?.map((slot, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <Input
                  value={slot.home}
                  onChange={(e) => updateSlot(round.key, idx, "home", e.target.value)}
                  placeholder="Team 1"
                  className="h-8 text-sm"
                />
                <span className="text-gray-400 font-bold text-sm">vs</span>
                <Input
                  value={slot.away}
                  onChange={(e) => updateSlot(round.key, idx, "away", e.target.value)}
                  placeholder="Team 2"
                  className="h-8 text-sm"
                />
                <Input
                  value={slot.winner}
                  onChange={(e) => updateSlot(round.key, idx, "winner", e.target.value)}
                  placeholder="Winner"
                  className="h-8 text-sm font-medium text-emerald-700"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="pt-6">
          <label className="block text-sm font-semibold mb-2">Tournament Winner</label>
          <Input
            value={tournamentWinner}
            onChange={(e) => setTournamentWinner(e.target.value)}
            placeholder="e.g. Brazil"
            className="max-w-xs"
          />
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving…" : saved ? "Saved!" : "Save Bracket"}
      </Button>
    </div>
  );
}
