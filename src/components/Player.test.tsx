/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import type { Film, ScheduleState } from "@/types";
import { createSupabaseMock } from "@/test/supabase-mock";

const hlsState = vi.hoisted(() => ({ instances: [] as unknown[] }));
const engine = vi.hoisted(() => ({ getCurrentSchedule: vi.fn() }));
const mock = createSupabaseMock();

vi.mock("@/lib/supabase", () => ({ supabase: mock.client }));
vi.mock("@/lib/schedule-engine", () => ({
  getCurrentSchedule: engine.getCurrentSchedule,
  formatDuration: (s: number) => `${Math.floor(s / 60)}min`,
}));

vi.mock("hls.js", () => {
  const Events = {
    MANIFEST_PARSED: "hlsManifestParsed",
    SUBTITLE_TRACKS_UPDATED: "hlsSubtitleTracksUpdated",
    ERROR: "hlsError",
  };
  const ErrorTypes = {
    NETWORK_ERROR: "networkError",
    MEDIA_ERROR: "mediaError",
    OTHER_ERROR: "otherError",
  };
  class MockHls {
    static Events = Events;
    static ErrorTypes = ErrorTypes;
    static isSupported = () => true;
    config: unknown;
    handlers = new Map<string, (event: string, data: unknown) => void>();
    subtitleTrack = -1;
    attachMedia = vi.fn();
    loadSource = vi.fn();
    destroy = vi.fn();
    startLoad = vi.fn();
    recoverMediaError = vi.fn();
    on = vi.fn((event: string, cb: (event: string, data: unknown) => void) => {
      this.handlers.set(event, cb);
    });
    constructor(config: unknown) {
      this.config = config;
      hlsState.instances.push(this);
    }
    trigger(event: string, data?: unknown) {
      this.handlers.get(event)?.(event, data);
    }
  }
  return { default: MockHls };
});

interface HlsInstance {
  config: { startPosition?: number };
  attachMedia: ReturnType<typeof vi.fn>;
  loadSource: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  startLoad: ReturnType<typeof vi.fn>;
  recoverMediaError: ReturnType<typeof vi.fn>;
  trigger: (event: string, data?: unknown) => void;
}

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function instances() {
  return hlsState.instances as HlsInstance[];
}

function makeFilm(over: Partial<Film> = {}): Film {
  return {
    id: "film-a",
    title: "Mulholland Drive",
    director: "David Lynch",
    year: 2001,
    duration: 8580,
    url: "https://cdn.test/films-hls/film-a/master.m3u8",
    ...over,
  };
}

function makeSchedule(over: Partial<ScheduleState> = {}): ScheduleState {
  return {
    currentFilm: makeFilm(),
    currentOffset: 10,
    intermission: null,
    nextFilms: [],
    cycleStart: 0,
    totalCycleDuration: 100000,
    soiree: null,
    upcomingSoirees: [],
    serverTime: Date.now(),
    ...over,
  };
}

async function renderPlayer(initial: ScheduleState) {
  const Player = (await import("@/components/Player")).default;
  const { ScheduleProvider } = await import("@/lib/schedule-context");
  return render(
    <ScheduleProvider initialSchedule={initial}>
      <Player />
    </ScheduleProvider>,
  );
}

async function pushSchedule(next: ScheduleState) {
  engine.getCurrentSchedule.mockReturnValue(next);
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ t: Date.now() }) });
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.reset();
  hlsState.instances.length = 0;
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ t: Date.now() }) });
  engine.getCurrentSchedule.mockReset();
  engine.getCurrentSchedule.mockReturnValue(makeSchedule());

  let currentTime = 0;
  Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
    configurable: true,
    get: () => currentTime,
    set: (v: number) => {
      currentTime = v;
    },
  });
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    writable: true,
    value: vi.fn(() => Promise.resolve()),
  });
});

describe("Player · chargement initial", () => {
  it("charge le film courant via hls.js au montage", async () => {
    const schedule = makeSchedule({ currentOffset: 42 });
    await renderPlayer(schedule);

    await waitFor(() => expect(instances()).toHaveLength(1));
    const hls = instances()[0];
    expect(hls.config.startPosition).toBe(42);
    expect(hls.loadSource).toHaveBeenCalledWith(schedule.currentFilm.url);
    expect(hls.attachMedia).toHaveBeenCalled();
  });
});

describe("Player · transitions", () => {
  it("recharge un nouveau flux quand le film change", async () => {
    await renderPlayer(makeSchedule());
    await waitFor(() => expect(instances()).toHaveLength(1));

    const nextUrl = "https://cdn.test/films-hls/film-b/master.m3u8";
    await pushSchedule(
      makeSchedule({ currentFilm: makeFilm({ id: "film-b", url: nextUrl }), currentOffset: 5 }),
    );

    await waitFor(() => expect(instances()).toHaveLength(2));
    expect(instances()[0].destroy).toHaveBeenCalled();
    expect(instances()[1].loadSource).toHaveBeenCalledWith(nextUrl);
  });

  it("réaligne la position quand la dérive dépasse le seuil", async () => {
    const { container } = await renderPlayer(makeSchedule({ currentOffset: 10 }));
    await waitFor(() => expect(instances()).toHaveLength(1));

    await pushSchedule(makeSchedule({ currentOffset: 300 }));

    const video = container.querySelector("video") as HTMLVideoElement;
    await waitFor(() => expect(video.currentTime).toBeGreaterThan(290));
    expect(instances()).toHaveLength(1);
  });
});

describe("Player · intermission", () => {
  it("détruit le flux en intermission puis le recrée au retour du film", async () => {
    await renderPlayer(makeSchedule());
    await waitFor(() => expect(instances()).toHaveLength(1));

    await pushSchedule(
      makeSchedule({
        intermission: { secondsLeft: 600, prevFilm: null },
        currentFilm: makeFilm(),
      }),
    );

    await waitFor(() => expect(instances()[0].destroy).toHaveBeenCalled());
    expect(screen.getByText(/Entracte/)).toBeInTheDocument();

    await pushSchedule(makeSchedule());

    await waitFor(() => expect(instances()).toHaveLength(2));
  });
});

describe("Player · erreur HLS", () => {
  it("tente un simple restart de charge sur erreur réseau fatale, sans reconstruire le flux", async () => {
    await renderPlayer(makeSchedule());
    await waitFor(() => expect(instances()).toHaveLength(1));

    act(() => {
      instances()[0].trigger("hlsError", { fatal: true, type: "networkError", details: "x" });
    });

    await waitFor(() => expect(screen.getByText(/antenne momentan/i)).toBeInTheDocument());
    expect(instances()[0].startLoad).toHaveBeenCalled();
    expect(instances()[0].destroy).not.toHaveBeenCalled();
    expect(instances()).toHaveLength(1);
  });

  it("tente une récupération média sur erreur média fatale, sans reconstruire le flux", async () => {
    await renderPlayer(makeSchedule());
    await waitFor(() => expect(instances()).toHaveLength(1));

    act(() => {
      instances()[0].trigger("hlsError", { fatal: true, type: "mediaError", details: "x" });
    });

    await waitFor(() => expect(screen.getByText(/resync/)).toBeInTheDocument());
    expect(instances()[0].recoverMediaError).toHaveBeenCalled();
    expect(instances()[0].destroy).not.toHaveBeenCalled();
    expect(instances()).toHaveLength(1);
  });

  it("reconstruit le flux depuis zéro sur une erreur fatale non récupérable", async () => {
    const schedule = makeSchedule();
    await renderPlayer(schedule);
    await waitFor(() => expect(instances()).toHaveLength(1));

    engine.getCurrentSchedule.mockReturnValue(schedule);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ t: Date.now() }) });

    act(() => {
      instances()[0].trigger("hlsError", { fatal: true, type: "otherError", details: "x" });
    });

    await waitFor(() => expect(screen.getByText(/resync/)).toBeInTheDocument());
    await waitFor(() => expect(instances()[0].destroy).toHaveBeenCalled(), { timeout: 3000 });
    await waitFor(() => expect(instances()).toHaveLength(2), { timeout: 3000 });
    expect(instances()[1].loadSource).toHaveBeenCalledWith(schedule.currentFilm.url);
  });
});
