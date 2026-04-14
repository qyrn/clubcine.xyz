"use client";

import { useEffect } from "react";
import { supabase } from "./supabase";

const INTERVAL_SECONDS = 60;

export function useWatchHeartbeat(username: string | null) {
  useEffect(() => {
    if (!username) return;

    const tick = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      await supabase.rpc("increment_watch_time", {
        p_username: username,
        p_seconds: INTERVAL_SECONDS,
      });
    };

    const id = setInterval(tick, INTERVAL_SECONDS * 1000);
    return () => clearInterval(id);
  }, [username]);
}
