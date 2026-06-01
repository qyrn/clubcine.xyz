"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
  const initialScheduleRef = useRef(initialSchedule);

  const fetchSchedule = useCallback(async () => {
    const before = Date.now();
    const res = await fetch("/api/schedule");
    if (!res.ok) throw new Error(`schedule ${res.status}`);
    const data = (await res.json()) as ScheduleState;
    const rtt = Date.now() - before;
    setSchedule({ ...data, currentOffset: data.currentOffset + rtt / 2000 });
  }, []);

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      await fetchSchedule();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      try {
        await fetchSchedule();
      } catch (err) {
        const message = err instanceof Error ? err.message : "schedule fetch failed";
        if (/^schedule \d/.test(message)) {
          reportError({ source: "schedule-provider", message });
        }
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [fetchSchedule]);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    queueMicrotask(tick);
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!initialScheduleRef.current) refresh();
    const poll = setInterval(refresh, pollIntervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollIntervalMs, refresh]);

  return (
    <ScheduleContext.Provider value={{ schedule, nowMs, refresh }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule(): ScheduleContextValue {
  return useContext(ScheduleContext);
}
