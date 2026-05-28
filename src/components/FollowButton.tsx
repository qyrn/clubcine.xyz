"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

interface Stats {
  followers: number;
  following: number;
  isFollowing: boolean;
}

interface Props {
  targetUserId: string;
  isMe: boolean;
  onStatsChange?: (s: Stats) => void;
}

async function loadStats(targetUserId: string, viewerId: string | null): Promise<Stats> {
  const [followersRes, followingRes, mineRes] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", targetUserId),
    supabase
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", targetUserId),
    viewerId
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", viewerId)
          .eq("following_id", targetUserId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
    isFollowing: !!(mineRes.data && (mineRes.data as { follower_id: string }).follower_id),
  };
}

export function useFollowStats(targetUserId: string | null, isMe: boolean) {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ followers: 0, following: 0, isFollowing: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!targetUserId) return;
    let cancelled = false;
    loadStats(targetUserId, user?.id ?? null).then((s) => {
      if (cancelled) return;
      setStats(s);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [targetUserId, user?.id]);

  const toggle = useCallback(async () => {
    if (!user || !targetUserId || isMe || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (stats.isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
        if (!error) {
          setStats((s) => ({ ...s, isFollowing: false, followers: Math.max(0, s.followers - 1) }));
        }
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: targetUserId });
        if (!error) {
          setStats((s) => ({ ...s, isFollowing: true, followers: s.followers + 1 }));
        }
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [user, targetUserId, isMe, stats.isFollowing]);

  return { stats, loading, busy, toggle };
}

export default function FollowButton({ targetUserId, isMe, onStatsChange }: Props) {
  const { user } = useAuth();
  const { stats, loading, busy, toggle } = useFollowStats(targetUserId, isMe);

  useEffect(() => {
    if (!loading) onStatsChange?.(stats);
  }, [stats, loading, onStatsChange]);

  if (isMe) return null;
  if (!user) {
    return (
      <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
        Connecte-toi pour suivre
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || loading}
      className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-md font-mono text-[10px] tracking-[0.16em] uppercase transition-colors cursor-pointer disabled:opacity-30 ${
        stats.isFollowing
          ? "border-line-2 text-ink-2 hover:border-red hover:text-red"
          : "border-ink text-ink hover:border-red hover:text-red"
      }`}
    >
      {busy ? "…" : stats.isFollowing ? "Suivi" : "+ Suivre"}
    </button>
  );
}
