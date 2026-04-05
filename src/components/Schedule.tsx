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
    <div className="bg-surface border border-border p-4">
      <h3 className="font-[var(--font-display)] text-[10px] text-text-dim uppercase tracking-wider mb-3">
        Prochaines diffusions
      </h3>

      <ul className="space-y-2">
        {schedule.nextFilms.map((film, i) => (
          <li
            key={`${film.id}-${i}`}
            className="flex items-baseline justify-between gap-2 py-2 border-b border-border last:border-0"
          >
            <div className="min-w-0">
              <p className="text-text text-xs truncate">{film.title}</p>
              <p className="text-text-dim text-[10px]">
                {film.director}, {film.year}
              </p>
            </div>
            <span className="text-text-dim text-[10px] font-mono shrink-0">
              {formatDuration(film.duration)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
