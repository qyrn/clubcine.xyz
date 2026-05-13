import { Film, ScheduleState, ScheduledFilmEntry, SoireeRuntime, UpcomingSoiree } from "@/types";
import { FILMS, CYCLE_EPOCH } from "@/data/schedule";
import { getResolvedSoirees, type ResolvedSoiree } from "@/data/soirees";

const SLOT_SECONDS = 30 * 60;
const CYCLE_EPOCH_SEC = Math.floor(CYCLE_EPOCH / 1000);

interface Slot {
  film: Film;
  start: number;
  end: number;
  slotEnd: number;
}

let cachedSlots: Slot[] | null = null;
let cachedTotal = 0;

function buildSlots(): { slots: Slot[]; total: number } {
  if (cachedSlots) return { slots: cachedSlots, total: cachedTotal };

  const slots: Slot[] = [];
  let cursor = 0;
  for (const film of FILMS) {
    const start = cursor;
    const end = start + film.duration;
    const remainder = end % SLOT_SECONDS;
    const slotEnd = remainder === 0 ? end : end + (SLOT_SECONDS - remainder);
    slots.push({ film, start, end, slotEnd });
    cursor = slotEnd;
  }

  cachedSlots = slots;
  cachedTotal = cursor;
  return { slots, total: cursor };
}

export function getTotalCycleDuration(): number {
  return buildSlots().total;
}

function computePausedSeconds(nowSec: number): number {
  const soirees = getResolvedSoirees();
  let paused = 0;
  for (const s of soirees) {
    if (s.endSec <= nowSec) paused += s.durationSec;
    else if (s.startSec <= nowSec) paused += nowSec - s.startSec;
    else break;
  }
  return paused;
}

function findActiveSoiree(nowSec: number): ResolvedSoiree | null {
  const soirees = getResolvedSoirees();
  for (const s of soirees) {
    if (s.startSec <= nowSec && nowSec < s.endSec) return s;
    if (s.startSec > nowSec) return null;
  }
  return null;
}

function findNextSoireeAfter(realTimeSec: number): ResolvedSoiree | null {
  const soirees = getResolvedSoirees();
  for (const s of soirees) {
    if (s.startSec >= realTimeSec) return s;
  }
  return null;
}

function toUpcomingSoiree(s: ResolvedSoiree): UpcomingSoiree {
  return {
    id: s.def.id,
    title: s.def.title,
    films: s.films,
    startsAt: s.startSec * 1000,
    endsAt: s.endSec * 1000,
    posterFilmId: s.def.posterFilmId,
    posterCustomUrl: s.def.posterCustomUrl,
    creditedSuggestionId: s.def.creditedSuggestionId,
    creditedUsername: s.def.creditedUsername,
  };
}

function getUpcomingSoirees(nowSec: number, max = 6): UpcomingSoiree[] {
  const soirees = getResolvedSoirees();
  const out: UpcomingSoiree[] = [];
  for (const s of soirees) {
    if (s.endSec > nowSec) {
      out.push(toUpcomingSoiree(s));
      if (out.length >= max) break;
    }
  }
  return out;
}

function buildSoireeRuntime(s: ResolvedSoiree, offsetInSoiree: number): {
  runtime: SoireeRuntime;
  currentFilm: Film;
  currentOffset: number;
  intermission: ScheduleState["intermission"];
} {
  let cursor = 0;
  for (let i = 0; i < s.films.length; i++) {
    const film = s.films[i];
    const filmEnd = cursor + film.duration;
    const remainder = filmEnd % SLOT_SECONDS;
    const isLast = i === s.films.length - 1;
    const slotEnd = isLast || remainder === 0 ? filmEnd : filmEnd + (SLOT_SECONDS - remainder);

    if (offsetInSoiree < filmEnd) {
      return {
        runtime: {
          id: s.def.id,
          title: s.def.title,
          subtitle: s.def.subtitle,
          films: s.films,
          currentIndex: i,
          startsAt: s.startSec * 1000,
          endsAt: s.endSec * 1000,
          posterFilmId: s.def.posterFilmId,
          posterCustomUrl: s.def.posterCustomUrl,
          creditedSuggestionId: s.def.creditedSuggestionId,
          creditedUsername: s.def.creditedUsername,
        },
        currentFilm: film,
        currentOffset: offsetInSoiree - cursor,
        intermission: null,
      };
    }
    if (!isLast && offsetInSoiree < slotEnd) {
      const nextFilm = s.films[i + 1];
      return {
        runtime: {
          id: s.def.id,
          title: s.def.title,
          subtitle: s.def.subtitle,
          films: s.films,
          currentIndex: i + 1,
          startsAt: s.startSec * 1000,
          endsAt: s.endSec * 1000,
          posterFilmId: s.def.posterFilmId,
          posterCustomUrl: s.def.posterCustomUrl,
          creditedSuggestionId: s.def.creditedSuggestionId,
          creditedUsername: s.def.creditedUsername,
        },
        currentFilm: nextFilm,
        currentOffset: 0,
        intermission: {
          secondsLeft: slotEnd - offsetInSoiree,
          prevFilm: film,
        },
      };
    }
    cursor = slotEnd;
  }
  const lastFilm = s.films[s.films.length - 1];
  return {
    runtime: {
      id: s.def.id,
      title: s.def.title,
      subtitle: s.def.subtitle,
      films: s.films,
      currentIndex: s.films.length - 1,
      startsAt: s.startSec * 1000,
      endsAt: s.endSec * 1000,
      posterFilmId: s.def.posterFilmId,
      posterCustomUrl: s.def.posterCustomUrl,
      creditedSuggestionId: s.def.creditedSuggestionId,
      creditedUsername: s.def.creditedUsername,
    },
    currentFilm: lastFilm,
    currentOffset: lastFilm.duration,
    intermission: null,
  };
}

function appendSoireeUpcoming(
  out: ScheduledFilmEntry[],
  soiree: ResolvedSoiree,
  skipUntilIndex: number,
  count: number,
): void {
  let internalReal = soiree.startSec;
  if (skipUntilIndex > 0) {
    let cursor = 0;
    for (let i = 0; i < skipUntilIndex; i++) {
      cursor += soiree.films[i].duration;
      if (i < soiree.films.length - 1) {
        const rem = cursor % SLOT_SECONDS;
        if (rem !== 0) cursor += SLOT_SECONDS - rem;
      }
    }
    internalReal = soiree.startSec + cursor;
  }
  for (let i = skipUntilIndex; i < soiree.films.length && out.length < count; i++) {
    const film = soiree.films[i];
    out.push({ film, startTime: internalReal * 1000 });
    internalReal += film.duration;
    if (i < soiree.films.length - 1) {
      const rem = internalReal % SLOT_SECONDS;
      if (rem !== 0) internalReal += SLOT_SECONDS - rem;
    }
  }
}

function buildNextEntries(
  startRealSec: number,
  startSlotIdx: number,
  startSlotOffsetEff: number,
  count: number,
): ScheduledFilmEntry[] {
  const { slots, total } = buildSlots();
  const out: ScheduledFilmEntry[] = [];

  let realCursor = startRealSec;
  let cycleIdx = startSlotIdx;

  let nextSlotRealStart = realCursor + (slots[cycleIdx].slotEnd - startSlotOffsetEff);
  cycleIdx = (cycleIdx + 1) % slots.length;

  let nextSoiree = findNextSoireeAfter(realCursor);

  while (out.length < count) {
    if (nextSoiree && nextSoiree.startSec <= nextSlotRealStart) {
      appendSoireeUpcoming(out, nextSoiree, 0, count);
      nextSlotRealStart = nextSoiree.endSec + (nextSlotRealStart - nextSoiree.startSec);
      realCursor = nextSoiree.endSec;
      nextSoiree = findNextSoireeAfter(realCursor);
      continue;
    }
    const slot = slots[cycleIdx];
    out.push({ film: slot.film, startTime: nextSlotRealStart * 1000 });
    const slotDur = slot.slotEnd - slot.start;
    nextSlotRealStart += slotDur;
    realCursor = nextSlotRealStart;
    cycleIdx = (cycleIdx + 1) % slots.length;

    if (out.length > total / SLOT_SECONDS + 50) break;
  }

  return out;
}

export function getCurrentSchedule(now: number = Date.now(), nextCount = 6): ScheduleState {
  const { slots, total } = buildSlots();
  const nowSec = Math.floor(now / 1000);

  const active = findActiveSoiree(nowSec);
  if (active) {
    const offsetInSoiree = nowSec - active.startSec;
    const { runtime, currentFilm, currentOffset, intermission } = buildSoireeRuntime(active, offsetInSoiree);

    const next: ScheduledFilmEntry[] = [];
    const skipFrom = intermission ? runtime.currentIndex : runtime.currentIndex + 1;
    appendSoireeUpcoming(next, active, skipFrom, nextCount);

    if (next.length < nextCount) {
      const pausedAfterSoiree = computePausedSeconds(active.endSec);
      const effAtSoireeEnd = active.endSec - pausedAfterSoiree;
      const elapsedAtEnd = ((effAtSoireeEnd - CYCLE_EPOCH_SEC) % total + total) % total;
      let cycleIdx = 0;
      for (let i = 0; i < slots.length; i++) {
        if (slots[i].slotEnd > elapsedAtEnd) {
          cycleIdx = i;
          break;
        }
      }
      const extra = buildNextEntries(active.endSec, cycleIdx, elapsedAtEnd, nextCount - next.length);
      next.push(...extra);
    }

    return {
      currentFilm,
      currentOffset,
      intermission,
      nextFilms: next.slice(0, nextCount),
      cycleStart: CYCLE_EPOCH,
      totalCycleDuration: total,
      soiree: runtime,
      upcomingSoirees: getUpcomingSoirees(nowSec).filter((s) => s.id !== active.def.id),
    };
  }

  const pausedSec = computePausedSeconds(nowSec);
  const effNowSec = nowSec - pausedSec;
  const elapsed = ((effNowSec - CYCLE_EPOCH_SEC) % total + total) % total;

  let currentIndex = 0;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].slotEnd > elapsed) {
      currentIndex = i;
      break;
    }
  }

  const slot = slots[currentIndex];
  let currentFilm: Film;
  let currentOffset: number;
  let intermission: ScheduleState["intermission"] = null;

  if (elapsed < slot.end) {
    currentFilm = slot.film;
    currentOffset = elapsed - slot.start;
  } else {
    const nextSlot = slots[(currentIndex + 1) % slots.length];
    currentFilm = nextSlot.film;
    currentOffset = 0;
    intermission = {
      secondsLeft: slot.slotEnd - elapsed,
      prevFilm: slot.film,
    };
  }

  const nextFilms = buildNextEntries(nowSec, currentIndex, elapsed, nextCount);

  return {
    currentFilm,
    currentOffset,
    intermission,
    nextFilms,
    cycleStart: CYCLE_EPOCH,
    totalCycleDuration: total,
    soiree: null,
    upcomingSoirees: getUpcomingSoirees(nowSec),
  };
}

export function getProgrammeForHours(hours: number, now: number = Date.now()): { film: Film; startTime: number }[] {
  const horizonMs = hours * 3600 * 1000;
  const horizonEnd = now + horizonMs;
  const schedule = getCurrentSchedule(now, 400);
  const out: { film: Film; startTime: number }[] = [];

  const nowMs = now;
  const firstStartMs = nowMs;
  out.push({ film: schedule.currentFilm, startTime: firstStartMs });

  for (const entry of schedule.nextFilms) {
    if (entry.startTime >= horizonEnd) break;
    out.push({ film: entry.film, startTime: entry.startTime });
    if (out.length > 200) break;
  }
  return out;
}

export function getTimeUntilNext(now: number = Date.now()): number {
  const schedule = getCurrentSchedule(now);
  if (schedule.intermission) return schedule.intermission.secondsLeft;
  return schedule.currentFilm.duration - schedule.currentOffset;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
