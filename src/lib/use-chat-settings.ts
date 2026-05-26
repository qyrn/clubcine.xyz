"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface ChatSettings {
  frozen: boolean;
  slowModeSeconds: number;
}

interface ChatSettingsRow {
  id: number;
  frozen: boolean;
  slow_mode_seconds: number;
}

const DEFAULT_SETTINGS: ChatSettings = { frozen: false, slowModeSeconds: 0 };

export function useChatSettings(): ChatSettings & { loading: boolean } {
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const apply = (row: ChatSettingsRow | null) => {
      if (cancelled) return;
      if (row) {
        setSettings({
          frozen: !!row.frozen,
          slowModeSeconds: row.slow_mode_seconds ?? 0,
        });
      }
      setLoading(false);
    };

    const load = async () => {
      const { data, error } = await supabase
        .from("chat_settings")
        .select("id,frozen,slow_mode_seconds")
        .eq("id", 1)
        .maybeSingle();
      if (error) {
        console.error("[useChatSettings] fetch error:", error);
        if (!cancelled) setLoading(false);
        return;
      }
      apply((data as ChatSettingsRow | null) ?? null);
    };

    load();

    const channel = supabase
      .channel("chat-settings")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_settings" },
        (payload) => {
          const row = payload.new as ChatSettingsRow;
          if (row.id === 1) apply(row);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { ...settings, loading };
}
