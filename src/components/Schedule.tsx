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
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] text-muted uppercase tracking-wide">
          programme
        </span>
        <span className="text-[10px] text-dim font-[var(--font-mono)]">
          {upcoming.length} prochains
        </span>
      </div>

      <div className="divide-y divide-border">
        {upcoming.map((film, i) => (
          <div key={`${film.id}-${i}`} className="py-4 flex gap-4">
            <span className="text-[11px] text-dim font-[var(--font-mono)] w-[45px] shrink-0 pt-1">
              {formatTime(film.startTime)}
            </span>

            {film.poster && (
              <img
                src={film.poster}
                alt={film.title}
                className="w-[45px] h-[65px] object-cover shrink-0 border border-border"
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="font-[var(--font-title)] text-[18px] text-[#d4cfc7] italic leading-tight">
                {film.title}
              </div>
              <div className="text-[11px] text-muted mt-1">
                {film.director}, {film.year}
                {film.country && <> &mdash; {film.country}</>}
                <span className="text-dim ml-2">{formatDuration(film.duration)}</span>
              </div>
              {film.synopsis && (
                <div className="text-[11px] text-dim mt-1.5 leading-relaxed line-clamp-2">
                  {film.synopsis}
                </div>
              )}
              <div className="flex items-center gap-3 mt-2">
                {film.movement && (
                  <span className="text-[10px] text-warm/60 italic">
                    {film.movement}
                  </span>
                )}
                {film.letterboxd && (
                  <a
                    href={film.letterboxd}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-muted hover:text-warm/70 transition-colors cursor-pointer"
                  >
                    letterboxd
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
