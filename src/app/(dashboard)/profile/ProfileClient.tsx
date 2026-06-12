"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Star, Camera, Check } from "lucide-react";
import type { Profile } from "@/types/database";
import { calcScorePredictionPoints } from "@/lib/utils";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";

const BRAND = "#1D9E75";

// ─── Preset avatars ───────────────────────────────────────────────────────────
const PRESET_AVATARS = [
  { id: "lion",    emoji: "🦁" },
  { id: "eagle",   emoji: "🦅" },
  { id: "fire",    emoji: "🔥" },
  { id: "rocket",  emoji: "🚀" },
  { id: "crown",   emoji: "👑" },
  { id: "bolt",    emoji: "⚡" },
  { id: "star",    emoji: "⭐" },
  { id: "shield",  emoji: "🛡️" },
  { id: "dragon",  emoji: "🐉" },
  { id: "wolf",    emoji: "🐺" },
  { id: "fox",     emoji: "🦊" },
  { id: "bear",    emoji: "🐻" },
];

// ─── Avatar picker modal ──────────────────────────────────────────────────────
function AvatarPicker({
  userId, username, currentUrl, onSaved, onClose,
}: {
  userId: string;
  username: string;
  currentUrl: string | null;
  onSaved: (url: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab]           = useState<"preset" | "upload">("preset");
  const [selected, setSelected] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const fileRef                 = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Max file size is 2 MB."); return; }
    setUploading(true); setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setError(upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setSelected(`${publicUrl}?t=${Date.now()}`); // cache-bust after re-upload
    setUploading(false);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    const supabase = createClient();
    const { error: saveErr } = await (supabase as any)
      .from("profiles")
      .update({ avatar_url: selected })
      .eq("id", userId);
    if (saveErr) { setError(saveErr.message); setSaving(false); return; }
    onSaved(selected);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>

        <h2 className="text-lg font-black text-gray-900">Choose your avatar</h2>

        {/* Live preview */}
        <div className="flex justify-center">
          <AvatarDisplay avatarUrl={selected ?? null} username={username} size="lg" />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["preset", "upload"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={tab === t
                ? { backgroundColor: "#fff", color: BRAND, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                : { backgroundColor: "transparent", color: "#6B7280" }
              }
            >
              {t === "preset" ? "Choose Avatar" : "Upload Photo"}
            </button>
          ))}
        </div>

        {/* Preset grid */}
        {tab === "preset" && (
          <div className="grid grid-cols-6 gap-2">
            {PRESET_AVATARS.map((a) => {
              const val = `preset:${a.id}`;
              const active = selected === val;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelected(val)}
                  className="relative aspect-square rounded-xl text-3xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={active
                    ? { backgroundColor: "#F0FDF4", outline: `2px solid ${BRAND}` }
                    : { backgroundColor: "#F9FAFB" }
                  }
                >
                  {a.emoji}
                  {active && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: BRAND }}
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Upload */}
        {tab === "upload" && (
          <div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors disabled:opacity-60"
            >
              <Camera className="w-8 h-8" />
              <span className="text-sm font-semibold">
                {uploading ? "Uploading…" : "Tap to choose a photo"}
              </span>
              <span className="text-xs">JPG, PNG or WebP · Max 2 MB</span>
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={handleSave}
          disabled={!selected || saving || uploading}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: BRAND }}
        >
          {saving ? "Saving…" : "Save Avatar"}
        </button>
      </div>
    </div>
  );
}

// ─── Main profile client ──────────────────────────────────────────────────────
interface Props {
  profile: Profile;
  recentPredictions: any[];
}

export function ProfileClient({ profile, recentPredictions }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [avatarUrl, setAvatarUrl]     = useState(profile.avatar_url);
  const [showPicker, setShowPicker]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await (supabase as any).from("profiles").update({ display_name: displayName }).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-black text-gray-900">Profile</h1>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

          {/* Avatar row */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <AvatarDisplay avatarUrl={avatarUrl} username={profile.username} size="lg" />
              <button
                onClick={() => setShowPicker(true)}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 border-white text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: BRAND }}
                title="Change avatar"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900">@{profile.username}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold text-sm" style={{ color: BRAND }}>
                  {profile.total_points} pts
                </span>
              </div>
            </div>
          </div>

          {/* Display name form */}
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: saved ? "#16A34A" : BRAND }}
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
            </button>
          </form>
        </div>

        {/* Recent predictions */}
        {recentPredictions.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Recent Predictions</h2>
            <div className="space-y-0">
              {recentPredictions.map((p) => {
                const match = p.matches;
                const pts =
                  match?.status === "finished" && match.home_score !== null
                    ? calcScorePredictionPoints(
                        { home: p.home_score, away: p.away_score },
                        { home: match.home_score, away: match.away_score }
                      )
                    : null;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm font-semibold text-gray-900">
                      {match?.home_team_code} {p.home_score}–{p.away_score} {match?.away_team_code}
                    </span>
                    <div className="flex items-center gap-2">
                      {match?.status === "finished" && (
                        <span className="text-xs text-gray-400">
                          actual {match.home_score}–{match.away_score}
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
            </div>
          </div>
        )}
      </div>

      {showPicker && (
        <AvatarPicker
          userId={profile.id}
          username={profile.username}
          currentUrl={avatarUrl}
          onSaved={(url) => { setAvatarUrl(url); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
