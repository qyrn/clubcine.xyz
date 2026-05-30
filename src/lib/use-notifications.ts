"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type NotificationType = "follow" | "guestbook" | "mention";

export interface AppNotification {
  id: string;
  actorId: string | null;
  actorUsername: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

interface NotificationRow {
  id: string;
  actor_id: string | null;
  actor_username: string;
  type: string;
  read: boolean;
  created_at: string;
}

const PAGE_SIZE = 20;

function toNotificationType(raw: string): NotificationType {
  if (raw === "guestbook") return "guestbook";
  if (raw === "mention") return "mention";
  return "follow";
}

function rowToNotification(r: NotificationRow): AppNotification {
  return {
    id: r.id,
    actorId: r.actor_id,
    actorUsername: r.actor_username,
    type: toNotificationType(r.type),
    read: r.read,
    createdAt: r.created_at,
  };
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(userId !== null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("notifications")
          .select("id,actor_id,actor_username,type,read,created_at")
          .eq("recipient_id", userId)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
        if (cancelled) return;
        setNotifications(((data ?? []) as NotificationRow[]).map(rowToNotification));
      } catch (e) {
        console.error("[useNotifications] load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev;
            return [rowToNotification(row), ...prev].slice(0, PAGE_SIZE);
          });
        }
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  const unreadCount = notifications.reduce((n, item) => (item.read ? n : n + 1), 0);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_id", userId)
      .eq("read", false);
  }, [userId]);

  return { notifications, unreadCount, loading, markRead, markAllRead };
}
