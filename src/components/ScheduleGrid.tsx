"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Film, ScheduleState } from "@/types";
import { formatDuration } from "@/lib/schedule-engine";

interface ScheduledFilm extends Film {
  startTime: number;
}

function formatHour(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}H${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function ScheduleGrid() {
  const [upcoming, setUpcoming] = useState<ScheduledFilm[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchSchedule = async () => {
      try {
        const res = await fetch("/api/schedule");
        const data: ScheduleState = await res.json();
        if (cancelled) return;

        const remaining = data.currentFilm.duration - data.currentOffset;
        let nextStart = Date.now() + remaining * 1000;
        const list: ScheduledFilm[] = data.nextFilms.map((film) => {
          const entry: ScheduledFilm = { ...film, startTime: nextStart };
          nextStart += film.duration * 1000;
          return entry;
        });
        setUpcoming(list);
      } catch {}
    };

    fetchSchedule();
    const interval = setInterval(fetchSchedule, 60_000);
    return () => {
      cancelled = true;
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
          href="#liste"
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
            <div
              className="aspect-[2/3] bg-cover bg-center transition-opacity group-hover:opacity-85 border border-line rounded-lg overflow-hidden"
              style={{ backgroundImage: film.poster ? `url(${film.poster})` : undefined }}
            />
            <div className="font-mono font-semibold text-[11px] leading-none tracking-[0.04em] text-red">
              {formatHour(film.startTime)} · {formatDuration(film.duration)}
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
