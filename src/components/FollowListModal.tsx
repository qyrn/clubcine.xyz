"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useEscapeKey } from "@/lib/use-escape-key";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useProfilesByUsername } from "@/lib/use-profiles";
import UserChip from "./UserChip";

type Kind = "followers" | "following";

interface Props {
  userId: string;
  username: string;
  kind: Kind;
  onClose: () => void;
}

interface ProfileRow {
  user_id: string;
  username: string;
}

const TITLES: Record<Kind, string> = {
  followers: "Abonnés",
  following: "Abonnements",
};

export default function FollowListModal({ userId, username, kind, onClose }: Props) {
  useEscapeKey(onClose);
  useBodyScrollLock(true);
  const [usernames, setUsernames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const column = kind === "followers" ? "follower_id" : "following_id";
      const filter = kind === "followers" ? "following_id" : "follower_id";

      const { data: relRows } = await supabase
        .from("follows")
        .select(column)
        .eq(filter, userId);

      if (cancelled) return;
      const ids = ((relRows ?? []) as Array<Record<string, string>>)
        .map((r) => r[column])
        .filter(Boolean);

      if (ids.length === 0) {
        setUsernames([]);
        setLoading(false);
        return;
      }

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("user_id,username")
        .in("user_id", ids);

      if (cancelled) return;
      setUsernames(((profileRows ?? []) as ProfileRow[]).map((p) => p.username));
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, kind]);

  const profileMap = useProfilesByUsername(usernames);
  const sorted = useMemo(() => [...usernames].sort((a, b) => a.localeCompare(b)), [usernames]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4"
      onClick={onClose}
    >
      <div
        className="border border-line bg-bg max-w-md w-full max-h-[80vh] flex flex-col rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-red">
            [ {TITLES[kind]} de @{username} ]
          </span>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink text-[12px] cursor-pointer transition-colors"
          >
            fermer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="font-mono text-[11px] tracking-[0.04em] text-ink-3 uppercase text-center py-6">
              Chargement…
            </div>
          ) : sorted.length === 0 ? (
            <div className="font-mono text-[11px] tracking-[0.04em] text-ink-4 italic text-center py-8">
              {kind === "followers" ? "Personne pour l'instant" : "Aucun suivi"}
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {sorted.map((u) => (
                <li key={u} className="py-3 first:pt-0 last:pb-0">
                  <UserChip
                    username={u}
                    profile={profileMap.get(u.toLowerCase())}
                    size="md"
                    className="text-[14px] font-semibold text-ink"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
