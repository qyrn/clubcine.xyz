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
    <div className="p-3 sm:border-r border-border">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block w-[6px] h-[6px] bg-on-air animate-[blink_1s_infinite]" />
        <span className="text-on-air text-[10px] uppercase tracking-widest">Live</span>
      </div>

      <div className="text-[13px] text-white font-bold mb-0.5">{currentFilm.title}</div>
      <div className="text-[11px] text-dim mb-3">{currentFilm.director}, {currentFilm.year}</div>

      <div className="w-full h-[2px] bg-[#222] overflow-hidden mb-1">
        <div
          className="h-full bg-on-air transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-dim">
        <span>{formatDuration(elapsed)}</span>
        <span>{formatDuration(currentFilm.duration)}</span>
      </div>
    </div>
  );
}
