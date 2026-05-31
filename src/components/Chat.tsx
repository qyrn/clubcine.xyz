"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useProfilesByUsername } from "@/lib/use-profiles";
import { useEmotes, type Emote } from "@/lib/use-emotes";
import { useMentionSearch, type MentionCandidate } from "@/lib/use-mention-search";
import { useChatSettings } from "@/lib/use-chat-settings";
import { ANON_PSEUDOS } from "@/data/anon-pseudos";
import { ChatMessage } from "@/types";
import UserChip from "./UserChip";
import EmoteText from "./EmoteText";
import EmotePicker from "./EmotePicker";
import MentionSuggestions from "./MentionSuggestions";
import EmoteSuggestions from "./EmoteSuggestions";
import BanUserDialog from "./BanUserDialog";
import ChatBanNotice from "./ChatBanNotice";
import { readStorage, writeStorage } from "@/lib/safe-storage";
import { usePersistentState } from "@/lib/use-persistent-state";

const COOLDOWN_KEY = "clubcine-chat-cooldown-until";

function parseTimestamp(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function serializeTimestamp(value: number | null): string {
  return value === null ? "" : String(value);
}

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
const MAX_LEN = 280;
const WARN_LEN = 240;
const EMOTE_MIN_QUERY = 2;
const EMOTE_MAX_RESULTS = 8;

function detectEmote(
  value: string,
  caret: number
): { query: string; anchor: number } | null {
  let i = caret - 1;
  let length = 0;
  while (i >= 0) {
    const c = value[i];
    if (c === ":") {
      const before = i === 0 ? " " : value[i - 1];
      if (i === 0 || /\s/.test(before)) {
        return { query: value.slice(i + 1, caret), anchor: i };
      }
      return null;
    }
    if (!/[a-z0-9-]/i.test(c)) return null;
    length++;
    if (length > 32) return null;
    i--;
  }
  return null;
}

function fmtFullDate(ts: number): string {
  return new Date(ts).toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((today - that) / 86_400_000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function DaySeparator({ label, compact }: { label: string; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${compact ? "py-1.5" : "py-2.5"}`}>
      <div className="flex-1 h-px bg-line" />
      <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-3 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-line" />
    </div>
  );
}

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
  const [cooldownUntil, setCooldownUntil] = usePersistentState<number | null>(
    COOLDOWN_KEY,
    null,
    parseTimestamp,
    serializeTimestamp
  );
  const [spamLockUntil, setSpamLockUntil] = useState<number | null>(null);
  const [clockTick, setClockTick] = useState(() => Date.now());

  const banUntilMs = profile?.chatBannedUntil
    ? new Date(profile.chatBannedUntil).getTime()
    : null;

  useEffect(() => {
    const slowTicking = !canModerate && cooldownUntil !== null && cooldownUntil > Date.now();
    const banTicking = banUntilMs !== null && banUntilMs > Date.now();
    const spamTicking = spamLockUntil !== null;
    if (!slowTicking && !banTicking && !spamTicking) return;
    const id = setInterval(() => {
      const now = Date.now();
      setClockTick(now);
      if (spamLockUntil !== null && now >= spamLockUntil) setSpamLockUntil(null);
    }, 250);
    return () => clearInterval(id);
  }, [cooldownUntil, banUntilMs, canModerate, spamLockUntil]);

  const cooldownRemaining = (() => {
    if (canModerate || !cooldownUntil) return 0;
    const remaining = Math.ceil((cooldownUntil - clockTick) / 1000);
    return Math.max(0, remaining);
  })();

  const isBanned = !canModerate && banUntilMs !== null && banUntilMs > clockTick;

  const spamRemaining = spamLockUntil
    ? Math.max(0, Math.ceil((spamLockUntil - clockTick) / 1000))
    : 0;

  const charCount = input.length;
  const overLimit = input.trim().length > MAX_LEN;
  const lockSeconds = Math.max(cooldownRemaining, spamRemaining);

  const isFrozenForMe = frozen && !canModerate;
  const inputDisabled = isFrozenForMe || !username;
  const submitDisabled =
    !input.trim() || isFrozenForMe || lockSeconds > 0 || overLimit;

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState(-1);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionResults = useMentionSearch(mentionQuery);
  const showMentions = mentionQuery !== null && mentionResults.length > 0;
  const safeMentionIndex = Math.min(
    mentionIndex,
    Math.max(0, mentionResults.length - 1)
  );

  const [emoteQuery, setEmoteQuery] = useState<string | null>(null);
  const [emoteAnchor, setEmoteAnchor] = useState(-1);
  const [emoteIndex, setEmoteIndex] = useState(0);
  const emoteResults = useMemo(() => {
    if (emoteQuery === null) return [];
    const q = emoteQuery.toLowerCase();
    if (q.length < EMOTE_MIN_QUERY) return [];
    const matches: Emote[] = [];
    for (const e of emotes.values()) {
      if (e.slug.includes(q) || e.label.toLowerCase().includes(q)) matches.push(e);
    }
    matches.sort((a, b) => {
      const ap = a.slug.startsWith(q) ? 0 : 1;
      const bp = b.slug.startsWith(q) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return a.slug.localeCompare(b.slug);
    });
    return matches.slice(0, EMOTE_MAX_RESULTS);
  }, [emoteQuery, emotes]);
  const showEmotes = !showMentions && emoteQuery !== null && emoteResults.length > 0;
  const safeEmoteIndex = Math.min(emoteIndex, Math.max(0, emoteResults.length - 1));

  const [atBottom, setAtBottom] = useState(true);
  const atBottomRef = useRef(true);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const next = dist < 60;
    atBottomRef.current = next;
    setAtBottom(next);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    atBottomRef.current = true;
    setAtBottom(true);
  };

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
    if (!atBottomRef.current) return;
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

  const closeEmote = () => {
    setEmoteQuery(null);
    setEmoteAnchor(-1);
  };

  const syncToken = (value: string, caret: number) => {
    const mention = detectMention(value, caret);
    if (mention) {
      setMentionQuery(mention.query);
      setMentionAnchor(mention.anchor);
      closeEmote();
      return;
    }
    closeMention();
    const emote = detectEmote(value, caret);
    if (emote) {
      setEmoteQuery(emote.query);
      setEmoteAnchor(emote.anchor);
    } else {
      closeEmote();
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    const caret = e.target.selectionStart ?? value.length;
    const mention = detectMention(value, caret);
    if (mention) {
      setMentionQuery(mention.query);
      setMentionAnchor(mention.anchor);
      setMentionIndex(0);
      closeEmote();
      return;
    }
    closeMention();
    const emote = detectEmote(value, caret);
    if (emote) {
      setEmoteQuery(emote.query);
      setEmoteAnchor(emote.anchor);
      setEmoteIndex(0);
    } else {
      closeEmote();
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

  const applyEmote = (emote: Emote) => {
    const el = inputRef.current;
    if (emoteAnchor < 0) return;
    const caret = el?.selectionStart ?? input.length;
    const before = input.slice(0, emoteAnchor);
    const after = input.slice(caret);
    const insertion = `:${emote.slug}: `;
    setInput(before + insertion + after);
    closeEmote();
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = before.length + insertion.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showEmotes) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setEmoteIndex((i) => (i + 1) % emoteResults.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setEmoteIndex((i) => (i - 1 + emoteResults.length) % emoteResults.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyEmote(emoteResults[safeEmoteIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeEmote();
      }
      return;
    }
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
    if (spamRemaining > 0) {
      setChatError(`tu spammes, pause encore ${spamRemaining} seconde${spamRemaining > 1 ? "s" : ""}`);
      return;
    }

    const text = input.trim();
    if (text.length > MAX_LEN) {
      setChatError(`message trop long, ${MAX_LEN} caractères maximum`);
      return;
    }
    setInput("");
    closeMention();
    closeEmote();

    const { error } = await supabase.from("messages").insert({
      username,
      text,
      timestamp: Date.now(),
    });
    if (error) {
      setInput(text);
      setChatError(error.message);
      const m = error.message.match(/(\d+)\s*secondes?/);
      if (m && /pause|spam/i.test(error.message)) {
        setSpamLockUntil(Date.now() + parseInt(m[1], 10) * 1000);
      }
      return;
    }
    setCooldownUntil(slowModeSeconds > 0 ? Date.now() + slowModeSeconds * 1000 : null);
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

  const statusText = frozen
    ? "Chat figé par la modération"
    : slowModeSeconds > 0
      ? `Slow mode · 1 message toutes les ${slowModeSeconds}s`
      : null;

  const statusTone = frozen ? "bg-red/10 text-red" : "bg-line/20 text-ink-3";

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
        {statusText && (
          <div
            className={`px-3 py-1.5 border-b border-line text-[10px] font-mono tracking-[0.12em] uppercase text-center ${statusTone}`}
          >
            {statusText}
          </div>
        )}
        <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto overflow-x-hidden px-3 py-2 space-y-0.5">
          {messages.length === 0 && (
            <div className="text-ink-3 text-[12px] pt-6 text-center font-mono uppercase tracking-[0.12em]">
              {loading ? "chargement…" : loadError ? "indisponible" : "personne ne parle"}
            </div>
          )}

          {messages.map((msg, i) => {
            const mine =
              !!selfMentionRe &&
              msg.username.toLowerCase() !== selfLower &&
              selfMentionRe.test(msg.text);
            const targetProfile = canModerate
              ? profileMap.get(msg.username.toLowerCase())
              : undefined;
            const showSep =
              i === 0 || !isSameDay(messages[i - 1].timestamp, msg.timestamp);
            return (
            <Fragment key={msg.id}>
            {showSep && <DaySeparator label={dayLabel(msg.timestamp)} compact />}
            <div
              className={`group relative text-[12px] leading-[1.55] break-words ${
                mine
                  ? "-mx-1.5 px-1.5 py-0.5 bg-red/[0.06] shadow-[inset_3px_0_0_0_var(--red)] rounded-[3px]"
                  : ""
              }`}
            >
              <span
                className="text-ink-3 text-[10px] font-mono tabular-nums align-middle mr-1.5 cursor-default"
                title={fmtFullDate(msg.timestamp)}
              >
                {formatTime(msg.timestamp)}
              </span>
              <UserChip
                username={msg.username}
                profile={profileMap.get(msg.username.toLowerCase())}
                size="sm"
                className="font-semibold text-ink align-middle mr-1"
              />
              <span className="text-ink-3">: </span>
              <EmoteText
                text={msg.text}
                emotes={emotes}
                size={18}
                className="text-ink-2"
                highlightSelf={selfLower}
              />
              {canModerate && (
                <span className="absolute top-0 right-0 group-hover:bg-bg/90 rounded-sm">
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
                </span>
              )}
            </div>
            </Fragment>
            );
          })}
        </div>
          {!atBottom && messages.length > 0 && (
            <button
              type="button"
              onClick={scrollToBottom}
              aria-label="revenir au direct"
              title="revenir au direct"
              className="absolute left-1/2 -translate-x-1/2 bottom-2 z-20 flex items-center justify-center w-8 h-8 rounded-full border border-line-2 bg-bg/90 backdrop-blur-sm text-ink-3 hover:text-red hover:border-red transition-colors cursor-pointer shadow-lg"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
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
          {showEmotes && (
            <EmoteSuggestions
              candidates={emoteResults}
              activeIndex={safeEmoteIndex}
              onPick={applyEmote}
              onHover={setEmoteIndex}
            />
          )}
          {charCount >= WARN_LEN && (
            <span
              className={`absolute -top-4 right-2 font-mono text-[10px] tabular-nums leading-none ${
                overLimit ? "text-red font-bold" : charCount >= 260 ? "text-red" : "text-ink-3"
              }`}
            >
              {charCount}/{MAX_LEN}
            </span>
          )}
          {isBanned && banUntilMs ? (
            <ChatBanNotice
              untilMs={banUntilMs}
              reason={profile?.chatBanReason ?? null}
              compact
            />
          ) : (
          <form onSubmit={sendMessage} className="border-t border-line p-2 flex gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={onInputChange}
              onKeyDown={onInputKeyDown}
              onSelect={(e) =>
                syncToken(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
              }
              placeholder={isFrozenForMe ? "Chat figé" : "Envoyer un message"}
              disabled={inputDisabled}
              className={`flex-1 bg-transparent border px-2 py-2 text-[12px] text-ink placeholder:text-ink-3 outline-none transition-colors min-h-[38px] disabled:opacity-50 disabled:cursor-not-allowed ${
                overLimit ? "border-red focus:border-red" : "border-line-2 focus:border-ink"
              }`}
            />
            <EmotePicker
              emotes={emotes}
              onPick={(slug) => insertAtCaret(`:${slug}:`)}
              compact
            />
            <button
              type="submit"
              disabled={submitDisabled}
              className="border border-ink px-3 text-[11px] text-ink font-semibold hover:border-red hover:text-red cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors min-h-[38px] min-w-[72px]"
            >
              {lockSeconds > 0 ? `${lockSeconds}s` : "Envoyer"}
            </button>
          </form>
          )}
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
      {statusText && (
        <div
          className={`mb-3 px-3 py-2 rounded-md border border-line text-[11px] font-mono tracking-[0.12em] uppercase text-center ${statusTone}`}
        >
          {statusText}
        </div>
      )}
      <div className="relative flex-1 min-h-[280px] max-h-[60vh] mb-4">
      <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto overflow-x-hidden">
        {messages.length === 0 && (
          <div className="text-ink-3 text-[12px] pt-6 text-center">personne ne parle</div>
        )}

        {messages.map((msg, i) => {
          const mine =
            !!selfMentionRe &&
            msg.username.toLowerCase() !== selfLower &&
            selfMentionRe.test(msg.text);
          const targetProfile = canModerate
            ? profileMap.get(msg.username.toLowerCase())
            : undefined;
          const showSep =
            i === 0 || !isSameDay(messages[i - 1].timestamp, msg.timestamp);
          return (
          <Fragment key={msg.id}>
          {showSep && <DaySeparator label={dayLabel(msg.timestamp)} />}
          <div
            className={`group relative py-1 text-[13px] leading-[1.6] break-words ${
              mine
                ? "-mx-2 px-2 bg-red/[0.06] shadow-[inset_3px_0_0_0_var(--red)] rounded-[3px]"
                : ""
            }`}
          >
            <span
              className="text-ink-3 text-[10px] font-mono tabular-nums align-middle mr-1.5 cursor-default"
              title={fmtFullDate(msg.timestamp)}
            >
              {formatTime(msg.timestamp)}
            </span>
            <UserChip
              username={msg.username}
              profile={profileMap.get(msg.username.toLowerCase())}
              size="sm"
              className="font-semibold text-ink align-middle mr-1"
            />
            <span className="text-ink-3">: </span>
            <EmoteText
              text={msg.text}
              emotes={emotes}
              size={22}
              className="text-ink-2"
              highlightSelf={selfLower}
            />
            {canModerate && (
              <span className="absolute top-0.5 right-0 group-hover:bg-bg/90 rounded-sm">
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
              </span>
            )}
          </div>
          </Fragment>
          );
        })}
      </div>
        {!atBottom && messages.length > 0 && (
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label="revenir au direct"
            title="revenir au direct"
            className="absolute left-1/2 -translate-x-1/2 bottom-2 z-20 flex items-center justify-center w-9 h-9 rounded-full border border-line-2 bg-bg/90 backdrop-blur-sm text-ink-3 hover:text-red hover:border-red transition-colors cursor-pointer shadow-lg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
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
        {showEmotes && (
          <EmoteSuggestions
            candidates={emoteResults}
            activeIndex={safeEmoteIndex}
            onPick={applyEmote}
            onHover={setEmoteIndex}
          />
        )}
        {charCount >= WARN_LEN && (
          <span
            className={`absolute -top-5 right-0 font-mono text-[11px] tabular-nums leading-none ${
              overLimit ? "text-red font-bold" : charCount >= 260 ? "text-red" : "text-ink-3"
            }`}
          >
            {charCount}/{MAX_LEN}
          </span>
        )}
        {isBanned && banUntilMs ? (
          <ChatBanNotice
            untilMs={banUntilMs}
            reason={profile?.chatBanReason ?? null}
            compact={false}
          />
        ) : (
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={onInputChange}
            onKeyDown={onInputKeyDown}
            onSelect={(e) =>
              syncToken(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
            }
            placeholder={isFrozenForMe ? "Chat figé" : "Envoyer un message"}
            disabled={inputDisabled}
            className={`flex-1 bg-transparent border px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              overLimit ? "border-red focus:border-red" : "border-line-2 focus:border-ink"
            }`}
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
            {lockSeconds > 0 ? `${lockSeconds}s` : "Envoyer"}
          </button>
        </form>
        )}
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
