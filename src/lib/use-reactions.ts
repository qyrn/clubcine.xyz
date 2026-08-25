"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export interface FloatingReaction {
  id: string;
  slug: string;
  left: number;
  drift: number;
  duration: number;
}

const LIFETIME_MS = 4600;
const BATCH_INTERVAL_MS = 200;
const MAX_QUEUE = 20;
const MAX_ON_SCREEN = 40;

function makeReaction(slug: string): FloatingReaction {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    slug,
    left: 6 + Math.random() * 88,
    drift: Math.round((Math.random() - 0.5) * 140),
    duration: Math.round(3600 + Math.random() * 1400),
  };
}

export function useReactions(): {
  reactions: FloatingReaction[];
  send: (slug: string) => void;
} {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const queueRef = useRef<string[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const spawn = (slug: string) => {
      const reaction = makeReaction(slug);
      setReactions((prev) => [...prev, reaction].slice(-MAX_ON_SCREEN));
      const timer = setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
        timers.delete(timer);
      }, LIFETIME_MS);
      timers.add(timer);
    };

    const channel = supabase.channel("reactions", {
      config: { broadcast: { self: true } },
    });
    channel
      .on("broadcast", { event: "reaction" }, (message) => {
        const slugs = (message as { payload?: { slugs?: unknown } }).payload?.slugs;
        if (!Array.isArray(slugs)) return;
        for (const slug of slugs) if (typeof slug === "string") spawn(slug);
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
      queueRef.current = [];
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  const flush = useCallback(() => {
    flushTimerRef.current = null;
    const slugs = queueRef.current;
    queueRef.current = [];
    const channel = channelRef.current;
    if (!channel || slugs.length === 0) return;
    void channel.send({ type: "broadcast", event: "reaction", payload: { slugs } });
  }, []);

  const send = useCallback(
    (slug: string) => {
      if (queueRef.current.length >= MAX_QUEUE) return;
      queueRef.current.push(slug);
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(flush, BATCH_INTERVAL_MS);
      }
    },
    [flush],
  );

  return { reactions, send };
}
