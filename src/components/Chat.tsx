"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { ChatMessage } from "@/types";

const COLORS = [
  "#c4a97d",
  "#7a8b6e",
  "#8b7a6e",
  "#6e7a8b",
  "#9b7a6e",
  "#6e8b7a",
  "#8b8b6e",
  "#7a6e8b",
];

function getColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function generateUsername(): string {
  const prefixes = [
    "kubrick", "godard", "tarkovski", "fellini", "lynch",
    "melies", "murnau", "wiene", "eisenstein", "pasolini",
    "jodorowsky", "gaspar", "haneke", "kiarostami", "apichatpong",
  ];
  const suffixes = [
    "fan", "vhs", "35mm", "noir", "cut",
    "reel", "rush", "dub", "sub", "raw",
  ];
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const s = suffixes[Math.floor(Math.random() * suffixes.length)];
  const n = Math.floor(Math.random() * 99);
  return `${p}_${s}${n}`;
}

const MAX_MESSAGES = 50;

export default function Chat() {
  const { username: authUsername } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [anonUsername, setAnonUsername] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const username = authUsername || anonUsername;

  useEffect(() => {
    const stored = localStorage.getItem("qyrn-username");
    if (stored) {
      setAnonUsername(stored);
    } else {
      const name = generateUsername();
      localStorage.setItem("qyrn-username", name);
      setAnonUsername(name);
    }
  }, []);

  useEffect(() => {
    supabase
      .from("messages")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(MAX_MESSAGES)
      .then(({ data }) => {
        if (data) setMessages(data.reverse() as ChatMessage[]);
      });

    const channel = supabase
      .channel("chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => {
            const next = [...prev, payload.new as ChatMessage];
            return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !username) return;

    const text = input.trim();
    setInput("");

    await supabase.from("messages").insert({
      username,
      text,
      timestamp: Date.now(),
    });
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border">
        <span className="text-[12px] text-muted uppercase tracking-wide">chat</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 min-h-0">
        {messages.length === 0 && (
          <div className="text-dim text-[12px] pt-6 text-center italic font-[var(--font-title)]">
            personne ne parle...
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="text-[12px] leading-[1.6] break-words">
            <span className="text-dim text-[10px] font-[var(--font-mono)] mr-1.5">{formatTime(msg.timestamp)}</span>
            <span className="font-medium" style={{ color: getColor(msg.username) }}>
              {msg.username}
            </span>
            <span className="text-border mx-0.5">&middot;</span>
            <span className="text-[#b5b0a8]">{msg.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t border-border p-2 flex gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="..."
          maxLength={280}
          className="flex-1 bg-transparent border border-border px-2 py-1.5 text-[12px] text-[#d4cfc7] placeholder:text-dim outline-none focus:border-raised"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="border border-border px-2.5 py-1.5 text-[11px] text-muted hover:text-warm hover:border-raised cursor-pointer disabled:opacity-20 disabled:cursor-default transition-colors"
        >
          envoyer
        </button>
      </form>
    </div>
  );
}
