"use client";

import { useEffect, useState } from "react";
import { Film, ScheduleState } from "@/types";
import { formatDuration } from "@/lib/schedule-engine";

interface ScheduledFilm extends Film {
  startTime: number;
}

export default function Schedule() {
  const [schedule, setSchedule] = useState<ScheduleState | null>(null);
  const [upcoming, setUpcoming] = useState<ScheduledFilm[]>([]);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch("/api/schedule");
        const data: ScheduleState = await res.json();
        setSchedule(data);

        const now = Date.now();
        const remaining = data.currentFilm.duration - data.currentOffset;
        let nextStart = now + remaining * 1000;
        const list: ScheduledFilm[] = data.nextFilms.map((film) => {
          const entry = { ...film, startTime: nextStart };
          nextStart += film.duration * 1000;
          return entry;
        });
        setUpcoming(list);
      } catch {
        /* noop */
      }
    };

    fetchSchedule();
    const interval = setInterval(fetchSchedule, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!schedule) return null;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-white/70 font-[var(--font-ui)] uppercase tracking-wide">
          programme
        </span>
        <span className="text-[10px] text-muted font-[var(--font-ui)]">
          [{upcoming.length} prochains]
        </span>
      </div>

      <div className="divide-y divide-border">
        {upcoming.map((film, i) => (
          <div key={`${film.id}-${i}`} className="py-3 flex gap-4">
            <span className="text-[12px] text-muted font-[var(--font-ui)] w-[45px] shrink-0 pt-0.5">
              {formatTime(film.startTime)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-[var(--font-title)] text-[15px] text-white/80 italic leading-tight">
                {film.title}
              </div>
              <div className="text-[11px] text-dim mt-0.5">
                {film.director}, {film.year} &mdash; {formatDuration(film.duration)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
