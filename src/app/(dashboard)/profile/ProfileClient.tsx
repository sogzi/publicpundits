"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Star } from "lucide-react";
import type { Profile } from "@/types/database";
import { calcScorePredictionPoints } from "@/lib/utils";

interface Props {
  profile: Profile;
  recentPredictions: any[];
}

export function ProfileClient({ profile, recentPredictions }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ display_name: displayName }).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-black">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Your Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-black uppercase">
              {profile.username[0]}
            </div>
            <div>
              <p className="font-bold text-lg">@{profile.username}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold text-emerald-700">{profile.total_points} pts</span>
              </div>
            </div>
          </div>
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving} size="sm">
              {saving ? "Saving…" : saved ? "Saved!" : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {recentPredictions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Predictions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentPredictions.map((p) => {
              const match = p.matches;
              const pts = match?.status === "finished" && match.home_score !== null
                ? calcScorePredictionPoints(
                    { home: p.home_score, away: p.away_score },
                    { home: match.home_score, away: match.away_score }
                  )
                : null;
              return (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm font-medium">
                    {match?.home_team_code} {p.home_score}–{p.away_score} {match?.away_team_code}
                  </span>
                  <div className="flex items-center gap-2">
                    {match?.status === "finished" && (
                      <span className="text-xs text-gray-500">
                        Result: {match.home_score}–{match.away_score}
                      </span>
                    )}
                    {pts !== null && (
                      <Badge variant={pts > 0 ? "default" : "secondary"}>+{pts} pts</Badge>
                    )}
                    {match?.status === "upcoming" && <Badge variant="outline">Pending</Badge>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
