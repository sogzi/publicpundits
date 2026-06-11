"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Trash2 } from "lucide-react";
import type { ChatMessage, Profile } from "@/types/database";

interface MessageWithProfile extends ChatMessage {
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url"> | null;
}

interface Props {
  matchId: string;
  userId: string;
  initialMessages: MessageWithProfile[];
}

export function MatchChat({ matchId, userId, initialMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${matchId}`)
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
        (payload) => {
          setMessages((m) => m.filter((msg) => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");
    await supabase.from("chat_messages").insert({ match_id: matchId, user_id: userId, content });
    setSending(false);
  }

  async function deleteMsg(id: string) {
    await supabase.from("chat_messages").delete().eq("id", id);
  }

  return (
    <div className="flex flex-col h-[480px]">
      <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Banter Room</h3>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
        {messages.filter((m) => !m.is_deleted).map((msg) => {
          const isOwn = msg.user_id === userId;
          return (
            <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
              <div
                className={`rounded-full w-7 h-7 flex-shrink-0 flex items-center justify-center text-xs font-bold uppercase ${
                  isOwn ? "bg-emerald-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {(msg.profiles?.username ?? "?")[0]}
              </div>
              <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                <span className="text-xs text-gray-400">{msg.profiles?.username ?? "Unknown"}</span>
                <div
                  className={`rounded-2xl px-3 py-2 text-sm break-words ${
                    isOwn
                      ? "bg-emerald-600 text-white rounded-tr-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
              {isOwn && (
                <button onClick={() => deleteMsg(msg.id)} className="self-start text-gray-300 hover:text-red-400 mt-5">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something..."
          maxLength={500}
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !text.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
