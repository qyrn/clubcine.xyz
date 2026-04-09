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
  const endTime = new Date(Date.now() + (currentFilm.duration - elapsed) * 1000);
  const endStr = `${endTime.getHours().toString().padStart(2, "0")}:${endTime.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div className="px-5 py-4 border-b border-border bg-surface">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-4 min-w-0">
          {currentFilm.poster && (
            <img
              src={currentFilm.poster}
              alt={currentFilm.title}
              className="w-[40px] h-[58px] object-cover shrink-0 border border-border"
            />
          )}
          <div className="flex items-center gap-1.5 shrink-0 pt-1.5">
            <span className="inline-block w-[7px] h-[7px] rounded-full bg-live animate-[blink_1.2s_infinite]" />
            <span className="text-live text-[10px] font-[var(--font-mono)] uppercase">on air</span>
          </div>
          <div className="min-w-0">
            <div className="font-[var(--font-title)] text-[28px] text-[#d4cfc7] italic leading-tight">
              {currentFilm.title}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[12px] text-muted">
                {currentFilm.director}, {currentFilm.year}
              </span>
              {currentFilm.movement && (
                <>
                  <span className="text-dim">/</span>
                  <span className="text-[11px] text-warm/70 italic">{currentFilm.movement}</span>
                </>
              )}
              {currentFilm.letterboxd && (
                <>
                  <span className="text-dim">/</span>
                  <a
                    href={currentFilm.letterboxd}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-muted hover:text-warm/70 transition-colors cursor-pointer"
                  >
                    letterboxd
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-dim font-[var(--font-mono)] shrink-0 pt-2">
          <span>{formatDuration(elapsed)}</span>
          <span className="text-border">/</span>
          <span>{formatDuration(currentFilm.duration)}</span>
          <span className="text-border">|</span>
          <span className="text-muted">fin ~{endStr}</span>
        </div>
      </div>

      <div className="w-full h-[3px] bg-border overflow-hidden rounded-full">
        <div
          className="h-full transition-all duration-1000 ease-linear rounded-full"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(to right, var(--color-warm), var(--color-red))",
          }}
        />
      </div>
    </div>
  );
}
