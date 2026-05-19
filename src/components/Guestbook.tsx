"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useProfilesByUsername } from "@/lib/use-profiles";
import UserChip from "./UserChip";

interface Entry {
  id: string;
  profile_user_id: string;
  author_user_id: string;
  author_username: string;
  message: string;
  created_at: string;
}

interface Props {
  profileUserId: string;
  profileUsername: string;
  isOwner: boolean;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Guestbook({ profileUserId, profileUsername, isOwner }: Props) {
  const { user, username } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("guestbook")
        .select("id,profile_user_id,author_user_id,author_username,message,created_at")
        .eq("profile_user_id", profileUserId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      setEntries((data ?? []) as Entry[]);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [profileUserId]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(t);
  }, [feedback]);

  const usernames = useMemo(
    () => entries.map((e) => e.author_username),
    [entries]
  );
  const profileMap = useProfilesByUsername(usernames);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !username || !message.trim() || submitting) return;
    setSubmitting(true);
    const text = message.trim();
    try {
      const { data, error } = await supabase
        .from("guestbook")
        .insert({
          profile_user_id: profileUserId,
          author_user_id: user.id,
          author_username: username,
          message: text,
        })
        .select("id,profile_user_id,author_user_id,author_username,message,created_at")
        .single();
      if (error) {
        setFeedback("✕ " + error.message);
        return;
      }
      if (data) setEntries((prev) => [data as Entry, ...prev]);
      setMessage("");
      setFeedback("★ Message envoyé");
    } catch (err) {
      setFeedback("✕ " + (err instanceof Error ? err.message : "Erreur inconnue"));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce message du livre d'or ?")) return;
    const prev = entries;
    setEntries((p) => p.filter((e) => e.id !== id));
    const { error } = await supabase.from("guestbook").delete().eq("id", id);
    if (error) {
      setEntries(prev);
      setFeedback("✕ " + error.message);
    }
  };

  return (
    <div className="grid grid-cols-[280px_1fr] gap-6 max-md:grid-cols-1">
      <div className="border border-line rounded-md p-5 flex flex-col gap-3 bg-bg">
        {isOwner ? (
          <>
            <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
              C&apos;est ton livre d&apos;or
            </div>
            <p className="text-[12px] leading-[1.6] text-ink-2 text-balance">
              Les messages laissés ici par les autres apparaîtront à droite.
              Tu peux supprimer les messages que tu reçois.
            </p>
          </>
        ) : !user ? (
          <>
            <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-red">
              Connexion requise
            </div>
            <p className="text-[12px] leading-[1.6] text-ink-2 text-balance">
              Connecte-toi pour laisser un mot sur le profil de @{profileUsername}.
            </p>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2">
            <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-red">
              Laisser un mot
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={280}
              placeholder="Un film, un souvenir, un compliment…"
              className="bg-transparent border border-line-2 px-3 py-2 text-[12px] text-ink placeholder:text-ink-3 outline-none focus:border-ink rounded-md resize-none"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] tracking-[0.04em] text-ink-4">
                {message.length}/280
              </span>
              <button
                type="submit"
                disabled={!message.trim() || submitting}
                className="px-3 py-1.5 border border-ink text-ink font-semibold text-[10px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30 rounded-md"
              >
                {submitting ? "…" : "Envoyer"}
              </button>
            </div>
            {feedback && (
              <div className="font-mono text-[10px] tracking-[0.04em] text-red">
                {feedback}
              </div>
            )}
          </form>
        )}
      </div>

      <div className="border border-line rounded-md p-5 bg-bg min-h-[200px]">
        {loading ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase">
            Chargement…
          </div>
        ) : entries.length === 0 ? (
          <div className="font-mono text-[12px] italic tracking-[0.04em] text-ink-4 uppercase text-center py-12">
            Aucun message pour le moment…
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {entries.map((e) => {
              const canDelete =
                user && (user.id === e.author_user_id || user.id === e.profile_user_id);
              return (
                <li key={e.id} className="py-3 first:pt-0 last:pb-0 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserChip
                        username={e.author_username}
                        profile={profileMap.get(e.author_username.toLowerCase())}
                        size="sm"
                        className="text-[12px] font-semibold text-ink"
                      />
                      <span className="font-mono text-[10px] tracking-[0.04em] text-ink-4 shrink-0">
                        {formatDate(e.created_at)}
                      </span>
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => remove(e.id)}
                        title="supprimer"
                        className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-4 hover:text-red transition-colors cursor-pointer shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="text-[13px] leading-[1.6] text-ink-2 break-words">{e.message}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
