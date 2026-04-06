"use client";

import { useEffect, useState } from "react";
import { ScheduleState } from "@/types";
import { formatDuration } from "@/lib/schedule-engine";

export default function NowPlaying() {
  const [schedule, setSchedule] = useState<ScheduleState | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch("/api/schedule");
        const data: ScheduleState = await res.json();
        setSchedule(data);
        setElapsed(data.currentOffset);
      } catch {
        /* noop */
      }
    };

    fetchSchedule();
    const interval = setInterval(fetchSchedule, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (schedule) setElapsed(schedule.currentOffset);
  }, [schedule]);

  if (!schedule) return null;

  const { currentFilm } = schedule;
  const progress = Math.min((elapsed / currentFilm.duration) * 100, 100);

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-[6px] h-[6px] rounded-full bg-live animate-[blink_1.2s_infinite]" />
            <span className="text-live text-[10px] font-[var(--font-ui)] uppercase">on air</span>
          </div>
          <span className="font-[var(--font-title)] text-white text-lg italic leading-tight">
            {currentFilm.title}
          </span>
          <span className="text-[12px] text-dim">
            {currentFilm.director}, {currentFilm.year}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted font-[var(--font-ui)]">
          <span>{formatDuration(elapsed)}</span>
          <span className="text-[#222]">/</span>
          <span>{formatDuration(currentFilm.duration)}</span>
        </div>
      </div>

      <div className="w-full h-[2px] bg-[#1a1a1a] overflow-hidden">
        <div
          className="h-full bg-warm/50 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
