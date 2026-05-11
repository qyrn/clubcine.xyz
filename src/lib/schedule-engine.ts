import { Film, ScheduleState } from "@/types";
import { FILMS, CYCLE_EPOCH } from "@/data/schedule";

const SLOT_SECONDS = 30 * 60;

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

export function getCurrentSchedule(now: number = Date.now(), nextCount = 6): ScheduleState {
  const { slots, total } = buildSlots();
  const elapsed = ((now - CYCLE_EPOCH) / 1000) % total;

  let currentIndex = 0;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].slotEnd > elapsed) {
      currentIndex = i;
      break;
    }
  }

  const slot = slots[currentIndex];
  const nextSlot = slots[(currentIndex + 1) % slots.length];

  let currentFilm: Film;
  let currentOffset: number;
  let intermission: ScheduleState["intermission"] = null;

  if (elapsed < slot.end) {
    currentFilm = slot.film;
    currentOffset = elapsed - slot.start;
  } else {
    currentFilm = nextSlot.film;
    currentOffset = 0;
    intermission = {
      secondsLeft: slot.slotEnd - elapsed,
      prevFilm: slot.film,
    };
  }

  const startOfNextFilm = intermission ? currentIndex + 1 : currentIndex + 1;
  const nextFilms: Film[] = [];
  for (let i = 0; i < nextCount; i++) {
    const idx = (startOfNextFilm + i) % slots.length;
    nextFilms.push(slots[idx].film);
  }

  return {
    currentFilm,
    currentOffset,
    intermission,
    nextFilms,
    cycleStart: CYCLE_EPOCH,
    totalCycleDuration: total,
  };
}

export function getProgrammeForHours(hours: number, now: number = Date.now()): { film: Film; startTime: number }[] {
  const horizonMs = hours * 3600 * 1000;
  const horizonEnd = now + horizonMs;
  const { slots, total } = buildSlots();
  const elapsed = ((now - CYCLE_EPOCH) / 1000) % total;

  let currentIndex = 0;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].slotEnd > elapsed) {
      currentIndex = i;
      break;
    }
  }

  const out: { film: Film; startTime: number }[] = [];
  const cycleAbsoluteStart = now - elapsed * 1000;
  let idx = currentIndex;
  let lap = 0;

  while (true) {
    const slot = slots[idx % slots.length];
    const cycleOffset = lap * total + slot.start;
    const startTime = cycleAbsoluteStart + cycleOffset * 1000;
    if (startTime >= horizonEnd) break;
    out.push({ film: slot.film, startTime });
    idx++;
    if (idx % slots.length === 0) lap++;
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
