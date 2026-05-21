"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface MentionCandidate {
  username: string;
  avatarUrl: string | null;
}

interface ProfileRow {
  username: string;
  avatar_url: string | null;
}

const LIMIT = 6;
const DEBOUNCE_MS = 160;

export function useMentionSearch(query: string | null): MentionCandidate[] {
  const [results, setResults] = useState<MentionCandidate[]>([]);

  useEffect(() => {
    const q = (query ?? "").trim();
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;
      if (q.length < 1) {
        setResults([]);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("username,avatar_url")
        .ilike("username", `${q}%`)
        .order("username", { ascending: true })
        .limit(LIMIT);
      if (cancelled) return;
      setResults(
        ((data ?? []) as ProfileRow[]).map((r) => ({
          username: r.username,
          avatarUrl: r.avatar_url,
        }))
      );
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return results;
}
