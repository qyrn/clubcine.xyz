import { Film, ScheduleState } from "@/types";
import { FILMS, CYCLE_EPOCH, getTotalCycleDuration } from "@/data/schedule";

export function getCurrentSchedule(now: number = Date.now()): ScheduleState {
  const totalDuration = getTotalCycleDuration();
  const elapsed = ((now - CYCLE_EPOCH) / 1000) % totalDuration;

  let accumulated = 0;
  let currentIndex = 0;

  for (let i = 0; i < FILMS.length; i++) {
    if (accumulated + FILMS[i].duration > elapsed) {
      currentIndex = i;
      break;
    }
    accumulated += FILMS[i].duration;
  }

  const currentFilm = FILMS[currentIndex];
  const currentOffset = elapsed - accumulated;

  const nextFilms: Film[] = [];
  for (let i = 1; i <= 4; i++) {
    nextFilms.push(FILMS[(currentIndex + i) % FILMS.length]);
  }

  return {
    currentFilm,
    currentOffset,
    nextFilms,
    cycleStart: CYCLE_EPOCH,
    totalCycleDuration: totalDuration,
  };
}

export function getTimeUntilNext(now: number = Date.now()): number {
  const schedule = getCurrentSchedule(now);
  return schedule.currentFilm.duration - schedule.currentOffset;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
