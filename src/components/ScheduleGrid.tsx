"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Film, ScheduleState } from "@/types";
import { formatDuration } from "@/lib/schedule-engine";

type ScheduledFilm = Film & { startTime: number };

function formatHour(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}H${d.getMinutes().toString().padStart(2, "0")}`;
}

function toList(schedule: ScheduleState): ScheduledFilm[] {
  return schedule.nextFilms.map((entry) => ({
    ...entry.film,
    startTime: entry.startTime,
  }));
}

interface Props {
  initialSchedule?: ScheduleState;
}

export default function ScheduleGrid({ initialSchedule }: Props = {}) {
  const [upcoming, setUpcoming] = useState<ScheduledFilm[]>(
    initialSchedule ? toList(initialSchedule) : []
  );

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 1500;
    const fetchSchedule = async () => {
      try {
        const res = await fetch("/api/schedule");
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data: ScheduleState = await res.json();
        if (cancelled) return;
        setUpcoming(toList(data));
        retryDelay = 1500;
      } catch {
        if (cancelled) return;
        retryTimer = setTimeout(fetchSchedule, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      }
    };

    fetchSchedule();
    const interval = setInterval(fetchSchedule, 60_000);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <section id="programme" className="px-10 py-15 border-b border-line max-md:px-5 max-md:py-10 scroll-mt-12">
      <div className="flex justify-between items-baseline mb-8">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.16em]">
          Programme · cette nuit
        </h2>
        <Link
          href="/programme"
          className="text-[12px] text-ink-3 font-medium hover:text-ink transition-colors after:content-['_→']"
        >
          Tout voir
        </Link>
      </div>

      <div className="grid grid-cols-6 gap-5 max-[1100px]:grid-cols-3 max-[600px]:grid-cols-2">
        {upcoming.map((film, i) => (
          <Link
            key={`${film.id}-${i}`}
            href="/movie"
            className="flex flex-col gap-3 group cursor-pointer"
          >
            <div className="relative">
              {film.poster && (
                <div
                  aria-hidden
                  className="absolute inset-0 translate-y-1.5 -z-10 bg-cover bg-center blur-[18px] opacity-20 saturate-125"
                  style={{ backgroundImage: `url(${film.poster})` }}
                />
              )}
              <div
                className="relative aspect-[2/3] bg-cover bg-center transition-opacity group-hover:opacity-90 border border-line rounded-lg overflow-hidden"
                style={{ backgroundImage: film.poster ? `url(${film.poster})` : undefined }}
              />
            </div>
            <div className="font-mono font-semibold text-[11px] leading-none tracking-[0.04em]">
              <span className="text-red">{formatHour(film.startTime)}</span>
              <span className="text-ink-3"> · {formatDuration(film.duration)}</span>
            </div>
            <div className="font-semibold text-[15px] leading-[1.2] tracking-[-0.01em]">
              {film.title}
            </div>
            <div className="text-[12px] text-ink-3 -mt-2">
              {film.director}, {film.year}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
