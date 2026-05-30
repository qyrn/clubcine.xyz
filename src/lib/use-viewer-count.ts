"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

type ViewerChannel = ReturnType<typeof supabase.channel>;

const KEY_STORAGE = "clubcine-viewer-key";

let channel: ViewerChannel | null = null;
let count = 0;
const listeners = new Set<(n: number) => void>();

function stableKey(): string {
  const fresh = `viewer-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  try {
    const existing = sessionStorage.getItem(KEY_STORAGE);
    if (existing) return existing;
    sessionStorage.setItem(KEY_STORAGE, fresh);
  } catch {}
  return fresh;
}

function ensureChannel() {
  if (channel) return;
  const key = stableKey();
  const ch = supabase.channel("viewers", { config: { presence: { key } } });
  ch.on("presence", { event: "sync" }, () => {
    count = Object.keys(ch.presenceState()).length;
    for (const cb of listeners) cb(count);
  });
  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") void ch.track({ at: Date.now() });
  });
  channel = ch;

  const teardown = () => {
    void ch.untrack();
  };
  window.addEventListener("pagehide", teardown);
}

export function useViewerCount(): number {
  const [n, setN] = useState(count);

  useEffect(() => {
    ensureChannel();
    listeners.add(setN);
    return () => {
      listeners.delete(setN);
    };
  }, []);

  return n;
}
