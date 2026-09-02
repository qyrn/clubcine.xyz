"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface Emote {
  slug: string;
  label: string;
  imageUrl: string;
  imagePath: string;
  uploaderId: string | null;
  createdAt: string;
}

interface EmoteRow {
  slug: string;
  label: string | null;
  image_url: string;
  image_path: string;
  uploader_id: string | null;
  created_at: string;
}

let cache: Map<string, Emote> | null = null;
let inflight: Promise<Map<string, Emote>> | null = null;
let realtimeReady = false;
const listeners = new Set<(map: Map<string, Emote>) => void>();

function ensureEmotesRealtime() {
  if (realtimeReady) return;
  realtimeReady = true;
  supabase
    .channel("emotes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "emotes" },
      () => invalidateEmotesCache()
    )
    .subscribe();
}

function rowToEmote(r: EmoteRow): Emote {
  return {
    slug: r.slug,
    label: r.label ?? "",
    imageUrl: r.image_url,
    imagePath: r.image_path,
    uploaderId: r.uploader_id,
    createdAt: r.created_at,
  };
}

async function fetchEmotes(): Promise<Map<string, Emote>> {
  const { data, error } = await supabase
    .from("emotes")
    .select("slug,label,image_url,image_path,uploader_id,created_at")
    .order("slug", { ascending: true });
  if (error) {
    console.error("[useEmotes] fetch error:", error);
    return new Map();
  }
  const map = new Map<string, Emote>();
  for (const r of (data ?? []) as EmoteRow[]) {
    map.set(r.slug, rowToEmote(r));
  }
  return map;
}

export function invalidateEmotesCache() {
  cache = null;
  inflight = null;
  void primeEmotes().then((map) => {
    for (const cb of listeners) cb(map);
  });
}

async function primeEmotes(): Promise<Map<string, Emote>> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = fetchEmotes().then((map) => {
    cache = map;
    inflight = null;
    return map;
  });
  return inflight;
}

export function useEmotes(): Map<string, Emote> {
  const [map, setMap] = useState<Map<string, Emote>>(() => cache ?? new Map());

  useEffect(() => {
    let cancelled = false;
    const cb = (next: Map<string, Emote>) => {
      if (!cancelled) setMap(next);
    };
    listeners.add(cb);
    ensureEmotesRealtime();
    void primeEmotes().then((next) => {
      if (!cancelled) setMap(next);
    });
    return () => {
      cancelled = true;
      listeners.delete(cb);
    };
  }, []);

  return map;
}
