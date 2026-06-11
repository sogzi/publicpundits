"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PitchGrid, type PitchPlayer } from "@/components/match/PitchGrid";
import type { Match, ScorePrediction, LineupPlayer, SquadPlayer } from "@/types/database";

const BRAND = "#1D9E75";

const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3", "5-3-2", "4-5-1"];

function defaultSlots(formation: string): PitchPlayer[] {
  const rows = formation.split("-").map(Number);
  const positions: string[] = ["GK"];
  const labels = ["DEF", "MID", "FWD"];
  rows.forEach((count, i) => {
    for (let j = 0; j < count; j++) positions.push(labels[Math.min(i, 2)]);
  });
  return positions.slice(0, 11).map((pos, i) => ({ name: "", shirt: i + 1, position: pos }));
}

interface Props {
  match: Match;
  userId: string | null;
  existing: ScorePrediction | null;
  homeLineupPlayers: LineupPlayer[] | null;
  awayLineupPlayers: LineupPlayer[] | null;
  homeSquad: SquadPlayer[];
  awaySquad: SquadPlayer[];
}

export function PredictTab({ match, userId, existing, homeLineupPlayers, awayLineupPlayers, homeSquad, awaySquad }: Props) {
  const locked = match.status !== "upcoming";

  // ── Score predictor state ────────────────────────────────────────────────
  const [homeScore, setHomeScore] = useState(existing?.home_score?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(existing?.away_score?.toString() ?? "");
  const [scoreSaving, setScoreSaving] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);

  // ── Lineup predictor state ───────────────────────────────────────────────
  const [homeFormation, setHomeFormation] = useState("4-3-3");
  const [awayFormation, setAwayFormation] = useState("4-3-3");

  function toSlots(players: LineupPlayer[] | null, formation: string): PitchPlayer[] {
    if (players?.length) {
      return players.map((p) => ({ name: p.name, shirt: p.shirt_number, position: p.position }));
    }
    return defaultSlots(formation);
  }

  const [homeSlots, setHomeSlots] = useState<PitchPlayer[]>(() => toSlots(homeLineupPlayers, "4-3-3"));
  const [awaySlots, setAwaySlots] = useState<PitchPlayer[]>(() => toSlots(awayLineupPlayers, "4-3-3"));
  const [lineupSaving, setLineupSaving] = useState<"home" | "away" | null>(null);
  const [lineupSaved, setLineupSaved] = useState<"home" | "away" | null>(null);

  if (locked) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">🔒</span>
        <h3 className="text-lg font-bold text-gray-900">Predictions are now closed</h3>
        <p className="text-sm text-gray-400 mt-1">The window closed at kickoff. Check the Overview tab for your score.</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">🔐</span>
        <h3 className="text-lg font-bold text-gray-900">Sign in to predict</h3>
        <a href="/login" className="mt-4 px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: BRAND }}>
          Sign in
        </a>
      </div>
    );
  }

  // ── Score submit ──────────────────────────────────────────────────────────
  async function submitScore(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setScoreSaving(true);
    const supabase = createClient();
    const payload = { user_id: userId, match_id: match.id, home_score: parseInt(homeScore), away_score: parseInt(awayScore) };
    if (existing) {
      await (supabase as any).from("score_predictions").update({ home_score: payload.home_score, away_score: payload.away_score }).eq("id", existing.id);
    } else {
      await (supabase as any).from("score_predictions").insert(payload);
    }
    setScoreSaving(false);
    setScoreSaved(true);
    setTimeout(() => setScoreSaved(false), 2500);
  }

  // ── Lineup submit ─────────────────────────────────────────────────────────
  async function submitLineup(side: "home" | "away") {
    if (!userId) return;
    const slots = side === "home" ? homeSlots : awaySlots;
    const formation = side === "home" ? homeFormation : awayFormation;
    const teamCode = side === "home" ? match.home_team_code : match.away_team_code;
    setLineupSaving(side);
    const supabase = createClient();
    await (supabase as any).from("lineup_predictions").upsert(
      { user_id: userId, match_id: match.id, team_code: teamCode, formation, players: slots as any },
      { onConflict: "user_id,match_id,team_code" }
    );
    setLineupSaving(null);
    setLineupSaved(side);
    setTimeout(() => setLineupSaved(null), 2500);
  }

  function pickPlayer(side: "home" | "away", idx: number, sp: SquadPlayer) {
    const next: PitchPlayer = { name: sp.name, shirt: sp.shirtNumber ?? null, position: sp.position };
    if (side === "home") setHomeSlots((prev) => prev.map((p, i) => i === idx ? next : p));
    else                 setAwaySlots((prev) => prev.map((p, i) => i === idx ? next : p));
  }

  return (
    <div className="space-y-8">
      {/* ── Score Predictor ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-bold text-gray-900 mb-4">Score Predictor</h2>
        <form onSubmit={submitScore}>
          <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-6">
            {/* Home */}
            <div className="flex-1 text-right">
              <p className="text-sm font-bold text-gray-900 mb-2">{match.home_team}</p>
              <input
                type="number" min={0} max={20} required
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-16 h-16 rounded-xl text-center text-3xl font-black border-2 border-gray-200 focus:outline-none ml-auto block"
                style={{ borderColor: homeScore !== "" ? BRAND : undefined }}
              />
            </div>
            <div className="text-3xl font-black text-gray-200 flex-shrink-0">–</div>
            {/* Away */}
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-gray-900 mb-2">{match.away_team}</p>
              <input
                type="number" min={0} max={20} required
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-16 h-16 rounded-xl text-center text-3xl font-black border-2 border-gray-200 focus:outline-none"
                style={{ borderColor: awayScore !== "" ? BRAND : undefined }}
              />
            </div>
          </div>
          <button
            type="submit" disabled={scoreSaving || homeScore === "" || awayScore === ""}
            className="w-full mt-3 py-3 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-50"
            style={{ backgroundColor: BRAND }}
          >
            {scoreSaving ? "Saving…" : scoreSaved ? "✓ Prediction saved!" : existing ? "Update Prediction" : "Submit Prediction"}
          </button>
        </form>
      </section>

      {/* ── Lineup Predictors ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-bold text-gray-900 mb-4">Lineup Predictor</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {(["home", "away"] as const).map((side) => {
            const teamName  = side === "home" ? match.home_team  : match.away_team;
            const slots     = side === "home" ? homeSlots        : awaySlots;
            const formation = side === "home" ? homeFormation    : awayFormation;
            const squad     = side === "home" ? homeSquad        : awaySquad;
            const setForm   = side === "home" ? setHomeFormation : setAwayFormation;
            const saving    = lineupSaving === side;
            const saved     = lineupSaved === side;

            return (
              <div key={side} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">{teamName} XI</h3>
                  <select
                    value={formation}
                    onChange={(e) => { setForm(e.target.value); (side === "home" ? setHomeSlots : setAwaySlots)(defaultSlots(e.target.value)); }}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white"
                  >
                    {FORMATIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                {/* Pitch */}
                <PitchGrid
                  formation={formation}
                  players={slots}
                  editable
                  squad={squad}
                  onPickPlayer={(idx, sp) => pickPlayer(side, idx, sp)}
                  flipped={side === "away"}
                />

                {/* Squad warning */}
                {squad.length === 0 && (
                  <p className="text-xs text-amber-500 text-center">Squad not yet synced — run /api/sync-squads</p>
                )}

                {/* Save button */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitLineup(side)}
                  className="w-full py-2.5 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: BRAND }}
                >
                  {saving ? "Saving…" : saved ? "✓ Lineup saved!" : "Save Lineup"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
