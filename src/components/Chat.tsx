"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/types";

const COLORS = [
  "#e8b600",
  "#ff3333",
  "#00cc66",
  "#33aaff",
  "#ff66cc",
  "#ff8833",
  "#aa66ff",
  "#66ffcc",
];

function getColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function generateUsername(): string {
  const adjectives = [
    "Anonymous",
    "Shadow",
    "Silent",
    "Dark",
    "Lost",
    "Lone",
    "Rogue",
    "Ghost",
    "Neon",
    "Void",
  ];
  const nouns = [
    "Cinephile",
    "Projecteur",
    "Bobine",
    "Pellicule",
    "Ecran",
    "Butoir",
    "Monteur",
    "Rewind",
    "Splice",
    "Frame",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 99);
  return `${adj}${noun}${num}`;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    <div className="bg-surface border border-border flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h3 className="font-[var(--font-display)] text-[10px] text-text-dim uppercase tracking-wider">
          Chat
        </h3>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
        {messages.length === 0 && (
          <p className="text-text-dim text-[10px] text-center py-8">
            Personne ne parle... sois le premier.
          </p>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="text-xs leading-relaxed break-words">
            <span className="text-text-dim text-[10px] mr-1">
              {formatTime(msg.timestamp)}
            </span>
            <span className="font-bold" style={{ color: getColor(msg.username) }}>
              {msg.username}
            </span>
            <span className="text-text-dim mx-1">:</span>
            <span className="text-text">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t border-border p-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="..."
            maxLength={280}
            className="flex-1 bg-background border border-border px-3 py-2 text-xs text-text placeholder:text-text-dim/50 outline-none focus:border-accent transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-accent text-background px-3 py-2 text-[10px] font-[var(--font-display)] uppercase hover:bg-accent-dim transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            OK
          </button>
        </div>
      </form>
    </div>
  );
}
