"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useProfilesByUsername } from "@/lib/use-profiles";
import { useEmotes } from "@/lib/use-emotes";
import { ANON_PSEUDOS } from "@/data/anon-pseudos";
import { ChatMessage } from "@/types";
import UserChip from "./UserChip";
import EmoteText from "./EmoteText";
import EmotePicker from "./EmotePicker";

function generateUsername(): string {
  const p = ANON_PSEUDOS[Math.floor(Math.random() * ANON_PSEUDOS.length)];
  const n = Math.floor(Math.random() * 100);
  return Math.random() < 0.5 ? p : `${p}_${String(n).padStart(2, "0")}`;
}

function isFromCurrentPool(name: string): boolean {
  const base = name.replace(/_\d{2}$/, "");
  return (ANON_PSEUDOS as readonly string[]).includes(base);
}

const MAX_MESSAGES = 50;

interface ChatProps {
  onCollapse?: () => void;
  extra?: React.ReactNode;
}

interface ModToolsProps {
  onDeleteMessage: () => void;
  onPurgeUser: () => void;
  username: string;
}

function ModTools({ onDeleteMessage, onPurgeUser, username }: ModToolsProps) {
  return (
    <span className="shrink-0 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={onDeleteMessage}
        title="Supprimer ce message"
        aria-label="Supprimer ce message"
        className="p-1 text-ink-3 hover:text-red hover:bg-line transition-colors cursor-pointer rounded-sm leading-none inline-flex items-center justify-center"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onPurgeUser}
        title={`Supprimer tous les messages de @${username}`}
        aria-label={`Supprimer tous les messages de @${username}`}
        className="p-1 text-ink-3 hover:text-red hover:bg-line transition-colors cursor-pointer rounded-sm leading-none inline-flex items-center justify-center"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      </button>
    </span>
  );
}

export default function Chat({ onCollapse, extra }: ChatProps = {}) {
  const compact = !!onCollapse;
  const { username: authUsername, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [anonUsername, setAnonUsername] = useState("");
  const [modError, setModError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emotes = useEmotes();

  const username = authUsername || anonUsername;
  const canModerate = profile?.role === "admin" || profile?.role === "moderateur";

  useEffect(() => {
    if (!modError) return;
    const t = setTimeout(() => setModError(null), 6000);
    return () => clearTimeout(t);
  }, [modError]);

  useEffect(() => {
    const stored = localStorage.getItem("clubcine-username");
    const name = stored && isFromCurrentPool(stored) ? stored : generateUsername();
    localStorage.setItem("clubcine-username", name);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnonUsername(name);
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
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          const oldId = (payload.old as { id?: number | string }).id;
          if (oldId === undefined) return;
          setMessages((prev) => prev.filter((m) => m.id !== oldId));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const usernames = useMemo(
    () => Array.from(new Set(messages.map((m) => m.username))),
    [messages]
  );
  const profileMap = useProfilesByUsername(usernames);

  const insertAtCaret = (snippet: string) => {
    const el = inputRef.current;
    if (!el) {
      setInput((v) => v + snippet);
      return;
    }
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const before = input.slice(0, start);
    const after = input.slice(end);
    const needsSpaceBefore = before.length > 0 && !before.endsWith(" ");
    const needsSpaceAfter = after.length > 0 && !after.startsWith(" ");
    const insertion =
      (needsSpaceBefore ? " " : "") + snippet + (needsSpaceAfter ? " " : "");
    const next = before + insertion + after;
    setInput(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = before.length + insertion.length;
      el.setSelectionRange(caret, caret);
    });
  };

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

  const rollback = (msgs: ChatMessage[]) => {
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const missing = msgs.filter((m) => !existingIds.has(m.id));
      return [...prev, ...missing].sort((a, b) => a.timestamp - b.timestamp);
    });
  };

  const deleteMessage = async (msg: ChatMessage) => {
    if (!canModerate) return;
    console.log("[chat] deleteMessage", { id: msg.id, idType: typeof msg.id, role: profile?.role });
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    const { data, error, status, statusText } = await supabase
      .from("messages")
      .delete()
      .eq("id", msg.id)
      .select("id");
    console.log("[chat] delete result", { data, error, status, statusText });
    if (error) {
      rollback([msg]);
      setModError(`Erreur Supabase : ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      rollback([msg]);
      setModError(
        "RLS a refusé la suppression. Ton rôle = " +
          (profile?.role ?? "null") +
          ". Vérifie la policy 'messages delete admin or moderator' dans Supabase."
      );
    }
  };

  const deleteAllFromUser = async (msg: ChatMessage) => {
    if (!canModerate) return;
    console.log("[chat] deleteAllFromUser", { username: msg.username, role: profile?.role });
    const targetUser = msg.username;
    const originals = messages.filter((m) => m.username === targetUser);
    setMessages((prev) => prev.filter((m) => m.username !== targetUser));
    const { data, error, status, statusText } = await supabase
      .from("messages")
      .delete()
      .eq("username", targetUser)
      .select("id");
    console.log("[chat] purge result", { data, error, status, statusText });
    if (error) {
      rollback(originals);
      setModError(`Erreur Supabase : ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      rollback(originals);
      setModError(
        "RLS a refusé la purge. Ton rôle = " +
          (profile?.role ?? "null") +
          ". Vérifie la policy 'messages delete admin or moderator' dans Supabase."
      );
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  if (compact) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2.5 border-b border-line flex items-center justify-between">
          <button
            onClick={onCollapse}
            className="text-ink-3 hover:text-ink cursor-pointer transition-colors"
            title="replier le chat (T)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
              <line x1="3" y1="4" x2="3" y2="20" />
            </svg>
          </button>
          <span className="text-[12px] text-ink-3 uppercase tracking-[0.16em]">chat</span>
          {extra ?? <div className="w-[14px]" />}
        </div>

        {modError && (
          <div className="px-3 py-2 border-b border-red bg-red/10 text-[11px] text-red font-mono leading-[1.4] break-words">
            ✕ {modError}
            <button
              type="button"
              onClick={() => setModError(null)}
              className="float-right text-red hover:text-ink text-[12px] cursor-pointer leading-none ml-2"
              aria-label="fermer"
            >
              ×
            </button>
          </div>
        )}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 min-h-0">
          {messages.length === 0 && (
            <div className="text-ink-3 text-[12px] pt-6 text-center">personne ne parle</div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="group text-[12px] leading-[1.6] break-words flex items-center gap-1.5">
              <span className="text-ink-3 text-[10px] font-mono shrink-0">{formatTime(msg.timestamp)}</span>
              <UserChip
                username={msg.username}
                profile={profileMap.get(msg.username.toLowerCase())}
                size="sm"
                className="font-semibold text-ink"
              />
              <span className="flex-1 min-w-0">
                <EmoteText
                  text={msg.text}
                  emotes={emotes}
                  size={18}
                  className="text-ink-2"
                />
              </span>
              {canModerate && (
                <ModTools
                  username={msg.username}
                  onDeleteMessage={() => deleteMessage(msg)}
                  onPurgeUser={() => deleteAllFromUser(msg)}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="border-t border-line p-2 flex gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="…"
            maxLength={280}
            className="flex-1 bg-transparent border border-line-2 px-2 py-1.5 text-[12px] text-ink placeholder:text-ink-3 outline-none focus:border-ink transition-colors"
          />
          <EmotePicker
            emotes={emotes}
            onPick={(slug) => insertAtCaret(`:${slug}:`)}
            compact
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="border border-line-2 px-2.5 py-1.5 text-[11px] text-ink-2 hover:text-ink hover:border-ink cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            envoyer
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-10 max-md:p-6 flex flex-col h-full">
      <div className="text-[13px] font-semibold uppercase tracking-[0.16em] mb-5 flex justify-between items-baseline">
        <span>Chat</span>
        <span className="font-mono font-medium text-[11px] tracking-[0.04em] text-ink-3 normal-case">
          {messages.length} message{messages.length > 1 ? "s" : ""}
        </span>
      </div>

      {modError && (
        <div className="mb-3 px-3 py-2 border border-red bg-red/10 text-[12px] text-red font-mono leading-[1.4] break-words rounded-md">
          ✕ {modError}
          <button
            type="button"
            onClick={() => setModError(null)}
            className="float-right text-red hover:text-ink text-[14px] cursor-pointer leading-none ml-2"
            aria-label="fermer"
          >
            ×
          </button>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 min-h-[280px] overflow-y-auto mb-4">
        {messages.length === 0 && (
          <div className="text-ink-3 text-[12px] pt-6 text-center">personne ne parle</div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="group py-1 text-[13px] leading-[1.5] break-words flex items-center gap-2">
            <span className="text-ink-3 text-[10px] font-mono shrink-0">{formatTime(msg.timestamp)}</span>
            <UserChip
              username={msg.username}
              profile={profileMap.get(msg.username.toLowerCase())}
              size="sm"
              className="font-semibold text-ink"
            />
            <span className="flex-1 min-w-0">
              <EmoteText
                text={msg.text}
                emotes={emotes}
                size={22}
                className="text-ink-2"
              />
            </span>
            {canModerate && (
              <ModTools
                username={msg.username}
                onDeleteMessage={() => deleteMessage(msg)}
                onPurgeUser={() => deleteAllFromUser(msg)}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Envoyer un message"
          maxLength={280}
          className="flex-1 bg-transparent border border-line-2 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink transition-colors"
        />
        <EmotePicker
          emotes={emotes}
          onPick={(slug) => insertAtCaret(`:${slug}:`)}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2.5 border border-ink bg-transparent text-ink font-semibold text-[12px] disabled:opacity-30 disabled:cursor-default cursor-pointer transition-colors hover:border-red hover:text-red"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
