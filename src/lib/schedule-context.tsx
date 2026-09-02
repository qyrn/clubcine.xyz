"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ScheduleState } from "@/types";
import { getCurrentSchedule } from "./schedule-engine";
import { reportError } from "./report-error";

const CLOCK_RESYNC_MS = 5 * 60_000;

interface ScheduleContextValue {
  schedule: ScheduleState | null;
  nowMs: number;
  refresh: () => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextValue>({
  schedule: null,
  nowMs: 0,
  refresh: async () => {},
});

interface ProviderProps {
  initialSchedule?: ScheduleState | null;
  children: React.ReactNode;
}

export function ScheduleProvider({ initialSchedule = null, children }: ProviderProps) {
  const [schedule, setSchedule] = useState<ScheduleState | null>(initialSchedule);
  const [nowMs, setNowMs] = useState<number>(() => initialSchedule?.serverTime ?? 0);
  const clockOffsetRef = useRef(0);
  const syncingRef = useRef(false);
  const lastGoodRef = useRef<ScheduleState | null>(initialSchedule);

  const recompute = useCallback(() => {
    const serverNow = Date.now() + clockOffsetRef.current;
    setNowMs(serverNow);
    try {
      const next: ScheduleState = { ...getCurrentSchedule(serverNow), serverTime: serverNow };
      lastGoodRef.current = next;
      setSchedule(next);
    } catch (err) {
      if (lastGoodRef.current) setSchedule(lastGoodRef.current);
      reportError({
        source: "schedule-engine",
        message: err instanceof Error ? err.message : "getCurrentSchedule threw",
      });
    }
  }, []);

  const syncClock = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const before = Date.now();
      const res = await fetch("/api/time", { cache: "no-store" });
      if (!res.ok) throw new Error(`time ${res.status}`);
      const { t } = (await res.json()) as { t: number };
      const after = Date.now();
      if (typeof t === "number" && Number.isFinite(t)) {
        clockOffsetRef.current = t + (after - before) / 2 - after;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "time fetch failed";
      if (/^time \d/.test(message)) reportError({ source: "schedule-provider", message });
    } finally {
      syncingRef.current = false;
      recompute();
    }
  }, [recompute]);

  useEffect(() => {
    recompute();
    const tick = setInterval(recompute, 1000);
    return () => clearInterval(tick);
  }, [recompute]);

  useEffect(() => {
    syncClock();
    const poll = setInterval(syncClock, CLOCK_RESYNC_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") syncClock();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [syncClock]);

  return (
    <ScheduleContext.Provider value={{ schedule, nowMs, refresh: syncClock }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule(): ScheduleContextValue {
  return useContext(ScheduleContext);
}
