"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, LogIn, Copy } from "lucide-react";
import type { League } from "@/types/database";

interface Props {
  userId: string;
  memberships: any[];
  owned: League[];
}

export function LeaguesClient({ userId, memberships, owned }: Props) {
  const [newName, setNewName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leagues, setLeagues] = useState<League[]>(owned);
  const [copied, setCopied] = useState<string | null>(null);

  async function createLeague(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("leagues") as any).insert({ name: newName, owner_id: userId });
    const { data } = await supabase.from("leagues").select("*").eq("owner_id", userId).order("created_at", { ascending: false }).limit(1).single();
    if (data) {
      setLeagues((l) => [...l, data]);
      setNewName("");
    }
    setCreating(false);
  }

  async function joinLeague(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    const supabase = createClient();
    const { data: league } = await supabase.from("leagues").select("id").eq("invite_code", inviteCode.toUpperCase()).maybeSingle();
    if (league) {
      await supabase.from("league_members").insert({ league_id: league.id, user_id: userId });
      setInviteCode("");
    }
    setJoining(false);
  }

  function copy(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black">Leagues</h1>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Create a League</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createLeague} className="space-y-3">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="League name" required />
              <Button type="submit" disabled={creating} className="w-full">{creating ? "Creating…" : "Create"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><LogIn className="h-4 w-4" /> Join a League</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={joinLeague} className="space-y-3">
              <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Invite code (e.g. AB12CD34)" required />
              <Button type="submit" disabled={joining} className="w-full">{joining ? "Joining…" : "Join"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {leagues.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Your Leagues</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => (
              <Card key={league.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{league.name}</p>
                      {league.description && <p className="text-xs text-gray-500 mt-0.5">{league.description}</p>}
                    </div>
                    <Users className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 flex-1 text-center font-mono tracking-widest">
                      {league.invite_code}
                    </code>
                    <button onClick={() => copy(league.invite_code)} className="text-gray-400 hover:text-emerald-600">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  {copied === league.invite_code && <p className="text-xs text-emerald-600 text-center mt-1">Copied!</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
