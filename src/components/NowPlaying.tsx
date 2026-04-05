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
    if (schedule) {
      setElapsed(schedule.currentOffset);
    }
  }, [schedule]);

  if (!schedule) return null;

  const { currentFilm } = schedule;
  const progress = Math.min((elapsed / currentFilm.duration) * 100, 100);

  return (
    <div className="bg-surface border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block w-2 h-2 rounded-full bg-red animate-[blink_1s_infinite]" />
        <span className="font-[var(--font-display)] text-[10px] text-red uppercase tracking-wider">
          On Air
        </span>
      </div>

      <h2 className="font-[var(--font-display)] text-accent text-sm leading-relaxed mb-1">
        {currentFilm.title}
      </h2>

      <p className="text-text-dim text-xs mb-3">
        {currentFilm.director}, {currentFilm.year}
      </p>

      <div className="w-full h-1 bg-border-light rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-accent transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-text-dim font-mono">
        <span>{formatDuration(elapsed)}</span>
        <span>{formatDuration(currentFilm.duration)}</span>
      </div>
    </div>
  );
}
