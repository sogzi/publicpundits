"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const BRAND = "#1D9E75";

interface LeagueRow {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  member_count: number;
  user_rank: number;
}

interface Props {
  userId: string;
  leagues: LeagueRow[];
}

// ─── Ordinal helper ───────────────────────────────────────────────────────────
function ordinal(n: number) {
  if (n === 0) return "—";
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Rank badge ───────────────────────────────────────────────────────────────
function RankPill({ rank }: { rank: number }) {
  const label = ordinal(rank);
  const isTop3 = rank > 0 && rank <= 3;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
      style={isTop3
        ? { backgroundColor: "#FEF9C3", color: "#854D0E" }
        : { backgroundColor: "#F3F4F6", color: "#374151" }
      }
    >
      {rank === 1 ? "🥇 " : rank === 2 ? "🥈 " : rank === 3 ? "🥉 " : ""}{label}
    </span>
  );
}

// ─── League card ──────────────────────────────────────────────────────────────
function LeagueCard({ league }: { league: LeagueRow }) {
  const [copied, setCopied] = useState(false);

  function copyInvite() {
    const url = `https://publicpundits.live/join/${league.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-tight">{league.name}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-gray-400">
              {league.member_count} {league.member_count === 1 ? "member" : "members"}
            </span>
            <span className="text-gray-200">·</span>
            <RankPill rank={league.user_rank} />
          </div>
        </div>
        {/* Invite code chip */}
        <div
          className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-black tracking-widest font-mono"
          style={{ backgroundColor: "#F0FDF4", color: BRAND }}
        >
          {league.invite_code}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <Link
          href={`/leagues/${league.id}`}
          className="flex-1 text-center py-2 px-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View Leaderboard
        </Link>
        <button
          onClick={copyInvite}
          className="flex-1 py-2 px-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: copied ? "#16A34A" : BRAND }}
        >
          {copied ? "✓ Copied!" : "Invite Friends"}
        </button>
      </div>
    </div>
  );
}

// ─── Create / Join modal ──────────────────────────────────────────────────────
function LeagueModal({ userId, onClose, onCreated, onJoined }: {
  userId: string;
  onClose: () => void;
  onCreated: (league: LeagueRow) => void;
  onJoined:  (league: LeagueRow) => void;
}) {
  const [tab, setTab]           = useState<"create" | "join">("create");
  const [name, setName]         = useState("");
  const [code, setCode]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { data, error: err } = await (supabase.from("leagues") as any)
      .insert({ name: name.trim(), owner_id: userId })
      .select()
      .single();
    if (err || !data) { setError(err?.message ?? "Could not create league. Try again."); setLoading(false); return; }
    // Also add creator as a member
    await (supabase.from("league_members") as any).insert({ league_id: data.id, user_id: userId });
    onCreated({ id: data.id, name: data.name, invite_code: data.invite_code, owner_id: data.owner_id, member_count: 1, user_rank: 1 });
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { data: league } = await (supabase.from("leagues") as any)
      .select("id, name, invite_code, owner_id")
      .eq("invite_code", code.trim().toUpperCase())
      .maybeSingle();
    if (!league) { setError("Invalid invite code. Check and try again."); setLoading(false); return; }
    const { error: joinErr } = await (supabase.from("league_members") as any).insert({ league_id: league.id, user_id: userId });
    if (joinErr) { setError("Already a member or could not join."); setLoading(false); return; }
    onJoined({ id: league.id, name: league.name, invite_code: league.invite_code, owner_id: league.owner_id, member_count: 1, user_rank: 1 });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["create", "join"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={tab === t
                ? { backgroundColor: "#fff", color: BRAND, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                : { backgroundColor: "transparent", color: "#6B7280" }
              }
            >
              {t === "create" ? "Create League" : "Join League"}
            </button>
          ))}
        </div>

        {tab === "create" ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">League name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Pundits FC"
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: BRAND }}
            >
              {loading ? "Creating…" : "Create League"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">6-character invite code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="e.g. AB12CD"
                maxLength={6}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono tracking-widest uppercase text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: BRAND }}
            >
              {loading ? "Joining…" : "Join League"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 gap-8">
      <div>
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-xl font-black text-gray-900">You're not in any leagues yet</h2>
        <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
          Create a private league and compete with friends, or join one with an invite code.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 w-full max-w-md">
        <button
          onClick={onOpen}
          className="rounded-2xl border-2 border-dashed p-6 text-center hover:border-emerald-400 hover:bg-emerald-50 transition-colors group"
          style={{ borderColor: "#D1FAE5" }}
        >
          <div className="text-3xl mb-2">➕</div>
          <p className="font-bold text-gray-900 text-sm">Create a League</p>
          <p className="text-xs text-gray-400 mt-1">Start fresh with your friends</p>
        </button>

        <button
          onClick={onOpen}
          className="rounded-2xl border-2 border-dashed p-6 text-center hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
          style={{ borderColor: "#D1FAE5" }}
        >
          <div className="text-3xl mb-2">🔑</div>
          <p className="font-bold text-gray-900 text-sm">Join a League</p>
          <p className="text-xs text-gray-400 mt-1">Enter a 6-character invite code</p>
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LeaguesClient({ userId, leagues: initial }: Props) {
  const [leagues, setLeagues] = useState<LeagueRow[]>(initial);
  const [showModal, setShowModal] = useState(false);

  function addLeague(l: LeagueRow) {
    setLeagues((prev) => [...prev, l]);
    setShowModal(false);
  }

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        {leagues.length > 0 && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Leagues</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {leagues.length} {leagues.length === 1 ? "league" : "leagues"}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              <span className="text-lg leading-none">+</span> New League
            </button>
          </div>
        )}

        {/* League cards or empty state */}
        {leagues.length === 0 ? (
          <EmptyState onOpen={() => setShowModal(true)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {leagues.map((l) => <LeagueCard key={l.id} league={l} />)}
          </div>
        )}
      </div>

      {/* Floating + button (only shown when in leagues) */}
      {leagues.length > 0 && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg text-white text-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40"
          style={{ backgroundColor: BRAND }}
          title="Create or join a league"
        >
          +
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <LeagueModal
          userId={userId}
          onClose={() => setShowModal(false)}
          onCreated={addLeague}
          onJoined={addLeague}
        />
      )}
    </>
  );
}
