"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, Profile } from "@/types/database";

const BRAND = "#1D9E75";

interface MessageWithProfile extends ChatMessage {
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url"> | null;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(iso));
}

interface Props {
  matchId: string;
  userId: string | null;
  initialMessages: MessageWithProfile[];
}

export function BanterTab({ matchId, userId, initialMessages }: Props) {
  const [messages, setMessages] = useState<MessageWithProfile[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase  = createClient();

  // Refresh relative times every minute
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`banter:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `match_id=eq.${matchId}` },
        async (payload) => {
          const { data } = await supabase
            .from("chat_messages")
            .select("*, profiles(username, display_name, avatar_url)")
            .eq("id", payload.new.id)
            .single();
          if (data) setMessages((m) => [...m, data as MessageWithProfile]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages", filter: `match_id=eq.${matchId}` },
        (payload) => setMessages((m) => m.filter((msg) => msg.id !== payload.old.id))
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending || !userId) return;
    setSending(true);
    setText("");
    await (supabase as any).from("chat_messages").insert({ match_id: matchId, user_id: userId, content });
    setSending(false);
  }

  async function deleteMsg(id: string) {
    await supabase.from("chat_messages").delete().eq("id", id);
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2 pr-0.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-300">
            <span className="text-3xl mb-1">💬</span>
            <p className="text-sm">No messages yet. Start the banter!</p>
          </div>
        )}

        {messages.filter((m) => !m.is_deleted).map((msg) => {
          const isOwn    = msg.user_id === userId;
          const username = msg.profiles?.display_name ?? msg.profiles?.username ?? "Fan";
          const initial  = username[0]?.toUpperCase() ?? "?";

          return (
            <div key={msg.id} className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: isOwn ? BRAND : "#94a3b8" }}
              >
                {initial}
              </div>

              <div className={`max-w-[75%] flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">{username}</span>
                  <span className="text-[10px] text-gray-300">{relativeTime(msg.created_at)}</span>
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl text-sm break-words leading-relaxed ${
                    isOwn ? "text-white rounded-tr-sm" : "bg-gray-100 text-gray-900 rounded-tl-sm"
                  }`}
                  style={isOwn ? { backgroundColor: BRAND } : undefined}
                >
                  {msg.content}
                </div>
              </div>

              {/* Delete (own messages) */}
              {isOwn && (
                <button
                  onClick={() => deleteMsg(msg.id)}
                  className="self-end mb-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity text-xs"
                  title="Delete"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="pt-3 border-t border-gray-100 mt-2">
        {userId ? (
          <form onSubmit={send} className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Say something…"
              maxLength={500}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40 flex-shrink-0"
              style={{ backgroundColor: BRAND }}
            >
              Send
            </button>
          </form>
        ) : (
          <div className="text-center py-3 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">
              <a href="/login" className="font-semibold underline" style={{ color: BRAND }}>Sign in</a>
              {" "}to join the banter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
