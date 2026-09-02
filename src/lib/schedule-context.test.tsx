/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import type { ScheduleState, Film } from "@/types";

const engine = vi.hoisted(() => ({ getCurrentSchedule: vi.fn() }));
vi.mock("@/lib/schedule-engine", () => ({ getCurrentSchedule: engine.getCurrentSchedule }));
vi.mock("@/lib/report-error", () => ({ reportError: vi.fn() }));

import { ScheduleProvider, useSchedule } from "@/lib/schedule-context";

function film(over: Partial<Film> = {}): Film {
  return {
    id: "film-a",
    title: "Mulholland Drive",
    director: "David Lynch",
    year: 2001,
    duration: 8580,
    url: "https://cdn.test/film-a/master.m3u8",
    ...over,
  };
}

function makeSchedule(over: Partial<ScheduleState> = {}): ScheduleState {
  return {
    currentFilm: film(),
    currentOffset: 10,
    intermission: null,
    nextFilms: [],
    cycleStart: 0,
    totalCycleDuration: 100000,
    soiree: null,
    upcomingSoirees: [],
    ...over,
  };
}

function Probe() {
  const { schedule, nowMs } = useSchedule();
  return (
    <div>
      <span data-testid="title">{schedule?.currentFilm.title ?? "–"}</span>
      <span data-testid="now">{nowMs}</span>
    </div>
  );
}

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  vi.clearAllMocks();
  engine.getCurrentSchedule.mockReturnValue(makeSchedule());
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ t: Date.now() }) });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ScheduleProvider", () => {
  it("calcule le planning localement via getCurrentSchedule", async () => {
    engine.getCurrentSchedule.mockReturnValue(
      makeSchedule({ currentFilm: film({ title: "Lost Highway" }) }),
    );
    render(
      <ScheduleProvider>
        <Probe />
      </ScheduleProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("title")).toHaveTextContent("Lost Highway"));
    expect(engine.getCurrentSchedule).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/time", expect.anything());
  });

  it("corrige l'horloge à partir de /api/time", async () => {
    const skewedServer = Date.now() + 3600_000;
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ t: skewedServer }) });

    render(
      <ScheduleProvider>
        <Probe />
      </ScheduleProvider>,
    );

    await waitFor(() => {
      const now = Number(screen.getByTestId("now").textContent);
      expect(now).toBeGreaterThan(Date.now() + 3000_000);
    });
  });

  it("garde le dernier planning valide si getCurrentSchedule jette", async () => {
    render(
      <ScheduleProvider initialSchedule={makeSchedule({ currentFilm: film({ title: "Eraserhead" }) })}>
        <Probe />
      </ScheduleProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("title")).toHaveTextContent("Mulholland Drive"));

    engine.getCurrentSchedule.mockImplementation(() => {
      throw new Error("bad soirée data");
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      for (let i = 0; i < 6; i++) await Promise.resolve();
    });
    expect(screen.getByTestId("title")).toHaveTextContent("Mulholland Drive");
  });
});
