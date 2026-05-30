"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useProfilesByUsername } from "@/lib/use-profiles";
import { useEmotes } from "@/lib/use-emotes";
import { useMentionSearch, type MentionCandidate } from "@/lib/use-mention-search";
import { useChatSettings } from "@/lib/use-chat-settings";
import { ANON_PSEUDOS } from "@/data/anon-pseudos";
import { ChatMessage } from "@/types";
import UserChip from "./UserChip";
import EmoteText from "./EmoteText";
import EmotePicker from "./EmotePicker";
import MentionSuggestions from "./MentionSuggestions";
import BanUserDialog from "./BanUserDialog";
import { readStorage, writeStorage } from "@/lib/safe-storage";

function generateUsername(): string {
  const p = ANON_PSEUDOS[Math.floor(Math.random() * ANON_PSEUDOS.length)];
  const n = Math.floor(Math.random() * 100);
  return Math.random() < 0.5 ? p : `${p}_${String(n).padStart(2, "0")}`;
}

function isFromCurrentPool(name: string): boolean {
  const base = name.replace(/_\d{2}$/, "");
  return (ANON_PSEUDOS as readonly string[]).includes(base);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectMention(
  value: string,
  caret: number
): { query: string; anchor: number } | null {
  let i = caret - 1;
  let length = 0;
  while (i >= 0) {
    const c = value[i];
    if (c === "@") {
      const before = i === 0 ? " " : value[i - 1];
      if (i === 0 || /\s/.test(before)) {
        return { query: value.slice(i + 1, caret), anchor: i };
      }
      return null;
    }
    if (!/[A-Za-z0-9_]/.test(c)) return null;
    length++;
    if (length > 20) return null;
    i--;
  }
  return null;
}

const MAX_MESSAGES = 50;

interface ChatProps {
  onCollapse?: () => void;
  extra?: React.ReactNode;
}

interface ModToolsProps {
  onDeleteMessage: () => void;
  onPurgeUser: () => void;
  onBanUser?: () => void;
  username: string;
}

function ModTools({ onDeleteMessage, onPurgeUser, onBanUser, username }: ModToolsProps) {
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
      {onBanUser && (
        <button
          type="button"
          onClick={onBanUser}
          title={`Bannir @${username} du chat`}
          aria-label={`Bannir @${username} du chat`}
          className="p-1 text-ink-3 hover:text-red hover:bg-line transition-colors cursor-pointer rounded-sm leading-none inline-flex items-center justify-center"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15 14" />
          </svg>
        </button>
      )}
    </span>
  );
}

export default function Chat({ onCollapse, extra }: ChatProps = {}) {
  const compact = !!onCollapse;
  const { username: authUsername, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [anonUsername, setAnonUsername] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<{ userId: string; username: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const emotes = useEmotes();

  const username = authUsername || anonUsername;
  const canModerate = profile?.role === "admin" || profile?.role === "moderateur";

  const { frozen, slowModeSeconds } = useChatSettings();
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [clockTick, setClockTick] = useState(() => Date.now());

  useEffect(() => {
    if (canModerate) return;
    if (lastSentAt === null || slowModeSeconds === 0) return;
    const id = setInterval(() => setClockTick(Date.now()), 250);
    return () => clearInterval(id);
  }, [lastSentAt, slowModeSeconds, canModerate]);

  const cooldownRemaining = (() => {
    if (canModerate) return 0;
    if (!lastSentAt || slowModeSeconds === 0) return 0;
    const remaining = Math.ceil(
      (lastSentAt + slowModeSeconds * 1000 - clockTick) / 1000
    );
    return Math.max(0, remaining);
  })();

  const isFrozenForMe = frozen && !canModerate;
  const inputDisabled = isFrozenForMe || !username;
  const submitDisabled =
    !input.trim() || isFrozenForMe || cooldownRemaining > 0;

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState(-1);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionResults = useMentionSearch(mentionQuery);
  const showMentions = mentionQuery !== null && mentionResults.length > 0;
  const safeMentionIndex = Math.min(
    mentionIndex,
    Math.max(0, mentionResults.length - 1)
  );

  const selfLower = username ? username.toLowerCase() : undefined;
  const selfMentionRe = useMemo(
    () => (selfLower ? new RegExp(`@${escapeRegExp(selfLower)}(?![a-z0-9_])`, "i") : null),
    [selfLower]
  );

  useEffect(() => {
    if (!chatError) return;
    const t = setTimeout(() => setChatError(null), 6000);
    return () => clearTimeout(t);
  }, [chatError]);

  useEffect(() => {
    const stored = readStorage("clubcine-username");
    const name = stored && isFromCurrentPool(stored) ? stored : generateUsername();
    writeStorage("clubcine-username", name);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnonUsername(name);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("timestamp", { ascending: false })
          .limit(MAX_MESSAGES);
        if (cancelled) return;
        if (error) {
          console.error("[Chat] fetch error:", error);
          setLoadError(true);
          return;
        }
        const tombstones = deletedIdsRef.current;
        const fresh = ((data ?? []) as ChatMessage[])
          .filter((m) => !tombstones.has(String(m.id)))
          .reverse();
        setLoadError(false);
        setMessages(fresh);
      } catch (e) {
        console.error("[Chat] fetch error:", e);
        setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMessages();

    const onVisible = () => {
      if (document.visibilityState === "visible") loadMessages();
    };
    document.addEventListener("visibilitychange", onVisible);

    const channel = supabase
      .channel("chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          if (deletedIdsRef.current.has(String(incoming.id))) return;
          setMessages((prev) => {
            if (prev.some((m) => String(m.id) === String(incoming.id))) return prev;
            const next = [...prev, incoming];
            return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          const oldId = (payload.old as { id?: number | string }).id;
          if (oldId === undefined || oldId === null) return;
          const key = String(oldId);
          deletedIdsRef.current.add(key);
          setMessages((prev) => prev.filter((m) => String(m.id) !== key));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
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

  const closeMention = () => {
    setMentionQuery(null);
    setMentionAnchor(-1);
  };

  const syncMention = (value: string, caret: number) => {
    const ctx = detectMention(value, caret);
    if (ctx) {
      setMentionQuery(ctx.query);
      setMentionAnchor(ctx.anchor);
    } else {
      closeMention();
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    const caret = e.target.selectionStart ?? value.length;
    const ctx = detectMention(value, caret);
    if (ctx) {
      setMentionQuery(ctx.query);
      setMentionAnchor(ctx.anchor);
      setMentionIndex(0);
    } else {
      closeMention();
    }
  };

  const applyMention = (candidate: MentionCandidate) => {
    const el = inputRef.current;
    if (mentionAnchor < 0) return;
    const caret = el?.selectionStart ?? input.length;
    const before = input.slice(0, mentionAnchor);
    const after = input.slice(caret);
    const insertion = `@${candidate.username} `;
    setInput(before + insertion + after);
    closeMention();
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = before.length + insertion.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMentions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % mentionResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((i) => (i - 1 + mentionResults.length) % mentionResults.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      applyMention(mentionResults[safeMentionIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMention();
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !username) return;
    if (isFrozenForMe) {
      setChatError("chat figé par la modération");
      return;
    }
    if (cooldownRemaining > 0) {
      setChatError(
        `slow mode actif, attends ${cooldownRemaining} seconde${cooldownRemaining > 1 ? "s" : ""}`
      );
      return;
    }

    const text = input.trim();
    setInput("");
    closeMention();

    const { error } = await supabase.from("messages").insert({
      username,
      text,
      timestamp: Date.now(),
    });
    if (error) {
      setInput(text);
      setChatError(error.message);
      return;
    }
    setLastSentAt(Date.now());
  };

  const rollback = (msgs: ChatMessage[]) => {
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const missing = msgs.filter((m) => !existingIds.has(m.id));
      return [...prev, ...missing].sort((a, b) => a.timestamp - b.timestamp);
    });
  };

  const refetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(MAX_MESSAGES);
    if (!data) return;
    const tombstones = deletedIdsRef.current;
    const fresh = (data as ChatMessage[])
      .filter((m) => !tombstones.has(String(m.id)))
      .reverse();
    setMessages(fresh);
  };

  const deleteMessage = async (msg: ChatMessage) => {
    if (!canModerate) return;
    const key = String(msg.id);
    if (deletedIdsRef.current.has(key)) return;
    deletedIdsRef.current.add(key);
    setMessages((prev) => prev.filter((m) => String(m.id) !== key));
    const { data, error } = await supabase
      .from("messages")
      .delete()
      .eq("id", msg.id)
      .select("id");
    if (error) {
      deletedIdsRef.current.delete(key);
      rollback([msg]);
      setChatError(`Erreur Supabase : ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      setChatError(
        "RLS a refusé la suppression. Ton rôle = " +
          (profile?.role ?? "null") +
          ". Vérifie la policy 'messages delete admin or moderator' dans Supabase."
      );
      await refetchMessages();
      return;
    }
    await refetchMessages();
  };

  const deleteAllFromUser = async (msg: ChatMessage) => {
    if (!canModerate) return;
    const targetUser = msg.username;
    const originals = messages.filter((m) => m.username === targetUser);
    for (const m of originals) deletedIdsRef.current.add(String(m.id));
    setMessages((prev) => prev.filter((m) => m.username !== targetUser));
    const { data, error } = await supabase
      .from("messages")
      .delete()
      .eq("username", targetUser)
      .select("id");
    if (error) {
      for (const m of originals) deletedIdsRef.current.delete(String(m.id));
      rollback(originals);
      setChatError(`Erreur Supabase : ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      setChatError(
        "RLS a refusé la purge. Ton rôle = " +
          (profile?.role ?? "null") +
          ". Vérifie la policy 'messages delete admin or moderator' dans Supabase."
      );
      await refetchMessages();
      return;
    }
    await refetchMessages();
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

        {chatError && (
          <div className="px-3 py-2 border-b border-red bg-red/10 text-[11px] text-red font-mono leading-[1.4] break-words">
            ✕ {chatError}
            <button
              type="button"
              onClick={() => setChatError(null)}
              className="float-right text-red hover:text-ink text-[12px] cursor-pointer leading-none ml-2"
              aria-label="fermer"
            >
              ×
            </button>
          </div>
        )}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-0.5 min-h-0">
          {messages.length === 0 && (
            <div className="text-ink-3 text-[12px] pt-6 text-center font-mono uppercase tracking-[0.12em]">
              {loading ? "chargement…" : loadError ? "indisponible" : "personne ne parle"}
            </div>
          )}

          {messages.map((msg) => {
            const mine =
              !!selfMentionRe &&
              msg.username.toLowerCase() !== selfLower &&
              selfMentionRe.test(msg.text);
            const targetProfile = canModerate
              ? profileMap.get(msg.username.toLowerCase())
              : undefined;
            return (
            <div
              key={msg.id}
              className={`group text-[12px] leading-[1.6] break-words flex items-center gap-1.5 ${
                mine
                  ? "-mx-1.5 px-1.5 py-0.5 bg-red/[0.06] shadow-[inset_3px_0_0_0_var(--red)] rounded-[3px]"
                  : ""
              }`}
            >
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
                  highlightSelf={selfLower}
                />
              </span>
              {canModerate && (
                <ModTools
                  username={msg.username}
                  onDeleteMessage={() => deleteMessage(msg)}
                  onPurgeUser={() => deleteAllFromUser(msg)}
                  onBanUser={
                    targetProfile?.userId
                      ? () => setBanTarget({ userId: targetProfile.userId, username: msg.username })
                      : undefined
                  }
                />
              )}
            </div>
            );
          })}
        </div>

        <div className="relative">
          {showMentions && (
            <MentionSuggestions
              candidates={mentionResults}
              activeIndex={safeMentionIndex}
              onPick={applyMention}
              onHover={setMentionIndex}
            />
          )}
          <form onSubmit={sendMessage} className="border-t border-line p-2 flex gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={onInputChange}
              onKeyDown={onInputKeyDown}
              onSelect={(e) =>
                syncMention(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
              }
              placeholder={isFrozenForMe ? "chat figé" : "…"}
              disabled={inputDisabled}
              maxLength={280}
              className="flex-1 bg-transparent border border-line-2 px-2 py-2 text-[12px] text-ink placeholder:text-ink-3 outline-none focus:border-ink transition-colors min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <EmotePicker
              emotes={emotes}
              onPick={(slug) => insertAtCaret(`:${slug}:`)}
              compact
            />
            <button
              type="submit"
              disabled={submitDisabled}
              className="border border-line-2 px-3 py-2 text-[11px] text-ink-2 hover:text-ink hover:border-ink cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors min-h-[36px] min-w-[64px] font-mono"
            >
              {cooldownRemaining > 0 ? `${cooldownRemaining}s` : "envoyer"}
            </button>
          </form>
        </div>
        {banTarget && (
          <BanUserDialog
            targetUserId={banTarget.userId}
            targetUsername={banTarget.username}
            onClose={() => setBanTarget(null)}
          />
        )}
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

      {chatError && (
        <div className="mb-3 px-3 py-2 border border-red bg-red/10 text-[12px] text-red font-mono leading-[1.4] break-words rounded-md">
          ✕ {chatError}
          <button
            type="button"
            onClick={() => setChatError(null)}
            className="float-right text-red hover:text-ink text-[14px] cursor-pointer leading-none ml-2"
            aria-label="fermer"
          >
            ×
          </button>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 min-h-[280px] overflow-y-auto overflow-x-hidden mb-4">
        {messages.length === 0 && (
          <div className="text-ink-3 text-[12px] pt-6 text-center">personne ne parle</div>
        )}

        {messages.map((msg) => {
          const mine =
            !!selfMentionRe &&
            msg.username.toLowerCase() !== selfLower &&
            selfMentionRe.test(msg.text);
          const targetProfile = canModerate
            ? profileMap.get(msg.username.toLowerCase())
            : undefined;
          return (
          <div
            key={msg.id}
            className={`group py-1 text-[13px] leading-[1.5] break-words flex items-center gap-2 ${
              mine
                ? "-mx-2 px-2 bg-red/[0.06] shadow-[inset_3px_0_0_0_var(--red)] rounded-[3px]"
                : ""
            }`}
          >
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
                highlightSelf={selfLower}
              />
            </span>
            {canModerate && (
              <ModTools
                username={msg.username}
                onDeleteMessage={() => deleteMessage(msg)}
                onPurgeUser={() => deleteAllFromUser(msg)}
                onBanUser={
                  targetProfile?.userId
                    ? () => setBanTarget({ userId: targetProfile.userId, username: msg.username })
                    : undefined
                }
              />
            )}
          </div>
          );
        })}
      </div>

      <div className="relative">
        {showMentions && (
          <MentionSuggestions
            candidates={mentionResults}
            activeIndex={safeMentionIndex}
            onPick={applyMention}
            onHover={setMentionIndex}
          />
        )}
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={onInputChange}
            onKeyDown={onInputKeyDown}
            onSelect={(e) =>
              syncMention(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
            }
            placeholder={isFrozenForMe ? "Chat figé" : "Envoyer un message"}
            disabled={inputDisabled}
            maxLength={280}
            className="flex-1 bg-transparent border border-line-2 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <EmotePicker
            emotes={emotes}
            onPick={(slug) => insertAtCaret(`:${slug}:`)}
          />
          <button
            type="submit"
            disabled={submitDisabled}
            className="px-4 py-2.5 border border-ink bg-transparent text-ink font-semibold text-[12px] disabled:opacity-30 disabled:cursor-default cursor-pointer transition-colors hover:border-red hover:text-red min-w-[88px]"
          >
            {cooldownRemaining > 0 ? `${cooldownRemaining}s` : "Envoyer"}
          </button>
        </form>
      </div>
      {banTarget && (
        <BanUserDialog
          targetUserId={banTarget.userId}
          targetUsername={banTarget.username}
          onClose={() => setBanTarget(null)}
        />
      )}
    </div>
  );
}
