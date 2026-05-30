"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ChatterTier, ViewerTier, chatterTier, viewerTier } from "./tiers";

export interface PublicProfile {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  badges: string[];
  watchSeconds: number;
  messageCount: number;
  viewerTier: ViewerTier | null;
  chatterTier: ChatterTier | null;
}

interface ProfileRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  role: string;
}

interface UserBadgeRow {
  user_id: string;
  badge_slug: string;
}

interface WatchRow {
  username: string;
  seconds: number;
}

interface MessageCountRow {
  username: string;
  count: number;
}

export function useProfilesByUsername(usernames: string[]): Map<string, PublicProfile> {
  const [map, setMap] = useState<Map<string, PublicProfile>>(new Map());
  const key = Array.from(new Set(usernames.filter(Boolean))).sort().join("|");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const list = key.split("|");
    const lowerList = list.map((u) => u.toLowerCase());

    const load = async () => {
      const [{ data: profiles }, { data: watches }, { data: msgs }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id,username,avatar_url,role")
          .in("username", list),
        supabase
          .from("watch_time")
          .select("username,seconds")
          .in("username", list),
        supabase
          .from("messages")
          .select("username")
          .in("username", list),
      ]);
      if (cancelled) return;

      const rows = (profiles ?? []) as ProfileRow[];
      const userIds = rows.map((r) => r.user_id);

      const badgeMap = new Map<string, string[]>();
      if (userIds.length > 0) {
        const { data: ubs } = await supabase
          .from("user_badges")
          .select("user_id,badge_slug")
          .in("user_id", userIds);
        if (cancelled) return;
        for (const ub of (ubs ?? []) as UserBadgeRow[]) {
          const arr = badgeMap.get(ub.user_id) ?? [];
          arr.push(ub.badge_slug);
          badgeMap.set(ub.user_id, arr);
        }
      }

      const watchByUser = new Map<string, number>();
      for (const w of (watches ?? []) as WatchRow[]) {
        watchByUser.set(w.username.toLowerCase(), w.seconds ?? 0);
      }

      const msgByUser = new Map<string, number>();
      for (const m of (msgs ?? []) as MessageCountRow[]) {
        const u = m.username.toLowerCase();
        msgByUser.set(u, (msgByUser.get(u) ?? 0) + 1);
      }

      const next = new Map<string, PublicProfile>();
      for (const r of rows) {
        const lowerName = r.username.toLowerCase();
        const seconds = watchByUser.get(lowerName) ?? 0;
        const messages = msgByUser.get(lowerName) ?? 0;
        next.set(lowerName, {
          userId: r.user_id,
          username: r.username,
          avatarUrl: r.avatar_url,
          role: r.role ?? "spectateur",
          badges: badgeMap.get(r.user_id) ?? [],
          watchSeconds: seconds,
          messageCount: messages,
          viewerTier: viewerTier(seconds),
          chatterTier: chatterTier(messages),
        });
      }
      setMap(next);
    };

    load();

    const channel = supabase
      .channel(`profiles-live:${key}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { username?: string } | null;
          const changed = row?.username?.toLowerCase();
          if (changed && lowerList.includes(changed)) load();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [key]);

  return map;
}
