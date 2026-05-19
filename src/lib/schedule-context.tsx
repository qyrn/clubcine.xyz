"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ScheduleState } from "@/types";
import { reportError } from "./report-error";

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
  pollIntervalMs?: number;
  children: React.ReactNode;
}

export function ScheduleProvider({
  initialSchedule = null,
  pollIntervalMs = 60_000,
  children,
}: ProviderProps) {
  const [schedule, setSchedule] = useState<ScheduleState | null>(initialSchedule);
  const [nowMs, setNowMs] = useState<number>(() => initialSchedule?.serverTime ?? 0);
  const fetchingRef = useRef(false);

  const refresh = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch("/api/schedule");
      if (!res.ok) throw new Error(`schedule ${res.status}`);
      const data = (await res.json()) as ScheduleState;
      setSchedule(data);
    } catch (err) {
      reportError({
        source: "schedule-provider",
        message: err instanceof Error ? err.message : "schedule fetch failed",
      });
    } finally {
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    setNowMs(Date.now());
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!initialSchedule) refresh();
    const poll = setInterval(refresh, pollIntervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollIntervalMs]);

  return (
    <ScheduleContext.Provider value={{ schedule, nowMs, refresh }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule(): ScheduleContextValue {
  return useContext(ScheduleContext);
}
