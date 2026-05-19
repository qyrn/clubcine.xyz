"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { Film, ScheduleState } from "@/types";
import { formatDuration } from "@/lib/schedule-engine";
import { useSchedule } from "@/lib/schedule-context";

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

export default function ScheduleGrid() {
  const { schedule } = useSchedule();
  const upcoming = useMemo<ScheduledFilm[]>(
    () => (schedule ? toList(schedule) : []),
    [schedule],
  );

  return (
    <section id="programme" className="px-10 py-15 border-b border-line max-md:px-5 max-md:py-10 scroll-mt-12">
      <div className="flex justify-between items-baseline mb-8">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.16em] text-balance">
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
            prefetch={false}
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
              <div className="relative aspect-[2/3] transition-opacity group-hover:opacity-90 border border-line rounded-lg overflow-hidden bg-bg">
                {film.poster && (
                  <Image
                    src={film.poster}
                    alt=""
                    fill
                    sizes="(max-width: 600px) 50vw, (max-width: 1100px) 33vw, 17vw"
                    className="object-cover"
                  />
                )}
              </div>
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
