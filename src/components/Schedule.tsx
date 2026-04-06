"use client";

import { useEffect, useState } from "react";
import { ScheduleState } from "@/types";
import { formatDuration } from "@/lib/schedule-engine";

export default function Schedule() {
  const [schedule, setSchedule] = useState<ScheduleState | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch("/api/schedule");
        const data: ScheduleState = await res.json();
        setSchedule(data);
      } catch {
        /* noop */
      }
    };

    fetchSchedule();
    const interval = setInterval(fetchSchedule, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!schedule) return null;

  return (
    <div className="p-3">
      <div className="text-[10px] text-muted font-[var(--font-ui)] mb-2">programme</div>
      <div className="space-y-0">
        {schedule.nextFilms.map((film, i) => (
          <div
            key={`${film.id}-${i}`}
            className="flex items-baseline justify-between py-1.5 border-b border-border last:border-0"
          >
            <div className="min-w-0 mr-3">
              <span className="font-[var(--font-title)] text-[15px] text-white/80 italic">{film.title}</span>
              <span className="text-[11px] text-dim ml-2">{film.director}, {film.year}</span>
            </div>
            <span className="text-[10px] text-muted font-[var(--font-ui)] shrink-0">{formatDuration(film.duration)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
