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
const SEND_COOLDOWN_MS = 450;
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
  const lastSentRef = useRef(0);

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
        const slug = (message as { payload?: { slug?: unknown } }).payload?.slug;
        if (typeof slug === "string") spawn(slug);
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  const send = useCallback((slug: string) => {
    const channel = channelRef.current;
    if (!channel) return;
    const now = Date.now();
    if (now - lastSentRef.current < SEND_COOLDOWN_MS) return;
    lastSentRef.current = now;
    void channel.send({ type: "broadcast", event: "reaction", payload: { slug } });
  }, []);

  return { reactions, send };
}
