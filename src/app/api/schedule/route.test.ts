import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Film, ScheduleState } from "@/types";
import { getCurrentSchedule } from "@/lib/schedule-engine";
import { GET } from "./route";

vi.mock("@/lib/schedule-engine", () => ({ getCurrentSchedule: vi.fn() }));

const mockGetCurrentSchedule = vi.mocked(getCurrentSchedule);

function film(id: string): Film {
  return {
    id,
    title: id,
    director: "Réal",
    year: 2000,
    duration: 3600,
    url: `https://cdn.test/${id}/master.m3u8`,
  };
}

function fakeSchedule(): ScheduleState {
  return {
    currentFilm: film("a"),
    currentOffset: 120,
    intermission: null,
    nextFilms: [{ film: film("b"), startTime: 5000 }],
    cycleStart: 0,
    totalCycleDuration: 3600,
    soiree: null,
    upcomingSoirees: [],
  };
}

beforeEach(() => {
  mockGetCurrentSchedule.mockReset();
});

describe("GET /api/schedule", () => {
  it("renvoie le schedule courant avec serverTime ajouté", async () => {
    const schedule = fakeSchedule();
    mockGetCurrentSchedule.mockReturnValue(schedule);

    const res = GET();
    const data = (await res.json()) as ScheduleState & { serverTime: number };

    expect(data.currentFilm).toEqual(schedule.currentFilm);
    expect(data.currentOffset).toBe(schedule.currentOffset);
    expect(data.nextFilms).toEqual(schedule.nextFilms);
    expect(typeof data.serverTime).toBe("number");
  });
});
