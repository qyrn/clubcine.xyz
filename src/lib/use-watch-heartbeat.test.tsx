/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

const { rpc } = vi.hoisted(() => ({
  rpc: vi.fn(async () => ({ data: null, error: null })),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }));

import { useWatchHeartbeat } from "@/lib/use-watch-heartbeat";

beforeEach(() => {
  vi.useFakeTimers();
  rpc.mockClear();
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useWatchHeartbeat", () => {
  it("ne fait rien sans username", () => {
    renderHook(() => useWatchHeartbeat(null, "blue-velvet"));
    vi.advanceTimersByTime(60_000);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("incrémente watch_time et film_progress toutes les 60s", async () => {
    renderHook(() => useWatchHeartbeat("lynch", "blue-velvet"));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(rpc).toHaveBeenCalledWith("increment_watch_time", {
      p_username: "lynch",
      p_seconds: 60,
    });
    expect(rpc).toHaveBeenCalledWith("increment_film_watch", {
      p_film_id: "blue-velvet",
      p_seconds: 60,
    });
  });

  it("n'incrémente pas film_progress pendant l'entracte (filmId null)", async () => {
    renderHook(() => useWatchHeartbeat("lynch", null));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(rpc).toHaveBeenCalledWith("increment_watch_time", expect.anything());
    expect(rpc).not.toHaveBeenCalledWith("increment_film_watch", expect.anything());
  });
});
