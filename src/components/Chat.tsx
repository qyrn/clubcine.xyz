"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/types";

const COLORS = [
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#9333ea",
  "#0891b2",
  "#e11d48",
  "#4f46e5",
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

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("qyrn-username");
    if (stored) {
      setUsername(stored);
    } else {
      const name = generateUsername();
      localStorage.setItem("qyrn-username", name);
      setUsername(name);
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !username) return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      username,
      text: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, message]);
    setInput("");
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-[10px] text-dim uppercase tracking-widest">Chat</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 min-h-0">
        {messages.length === 0 && (
          <div className="text-dim text-[11px] pt-6 text-center">
            personne ne parle...
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="text-[12px] leading-[1.6] break-words">
            <span className="text-dim text-[10px] mr-1.5">[{formatTime(msg.timestamp)}]</span>
            <span className="font-bold" style={{ color: getColor(msg.username) }}>
              {msg.username}:
            </span>{" "}
            <span className="text-white">{msg.text}</span>
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
          className="flex-1 bg-transparent border border-border px-2 py-1.5 text-[12px] text-white placeholder:text-[#333] outline-none focus:border-dim"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="border border-border px-2.5 py-1.5 text-[10px] text-dim uppercase tracking-wider hover:text-white hover:border-dim cursor-pointer disabled:opacity-20 disabled:cursor-default"
        >
          envoyer
        </button>
      </form>
    </div>
  );
}
