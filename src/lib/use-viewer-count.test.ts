/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createSupabaseMock } from "@/test/supabase-mock";

let mock: ReturnType<typeof createSupabaseMock>;

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  mock = createSupabaseMock();
  vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));
});

describe("useViewerCount", () => {
  it("crée le channel presence singleton et track() une fois SUBSCRIBED", async () => {
    const { useViewerCount } = await import("@/lib/use-viewer-count");
    renderHook(() => useViewerCount());

    expect(mock.client.channel).toHaveBeenCalledWith(
      "viewers",
      expect.objectContaining({ config: expect.objectContaining({ presence: expect.any(Object) }) }),
    );
    const channel = mock.findChannel("viewers");
    expect(channel.track).toHaveBeenCalled();
  });

  it("dérive le compteur depuis presenceState() sur un sync", async () => {
    const { useViewerCount } = await import("@/lib/use-viewer-count");
    const { result } = renderHook(() => useViewerCount());

    mock.state.presence.viewers = {
      "viewer-1": [{ at: 1 }],
      "viewer-2": [{ at: 2 }],
      "viewer-3": [{ at: 3 }],
    };
    act(() => {
      mock.findChannel("viewers").emit("sync", undefined);
    });

    expect(result.current).toBe(3);
  });

  it("partage le compteur entre plusieurs instances du hook (singleton)", async () => {
    const { useViewerCount } = await import("@/lib/use-viewer-count");
    const first = renderHook(() => useViewerCount());
    const second = renderHook(() => useViewerCount());

    mock.state.presence.viewers = { "viewer-1": [{ at: 1 }] };
    act(() => {
      mock.findChannel("viewers").emit("sync", undefined);
    });

    expect(first.result.current).toBe(1);
    expect(second.result.current).toBe(1);
    expect(mock.client.channel).toHaveBeenCalledTimes(1);
  });

  it("revient à zéro quand plus personne n'est présent", async () => {
    const { useViewerCount } = await import("@/lib/use-viewer-count");
    const { result } = renderHook(() => useViewerCount());

    mock.state.presence.viewers = { "viewer-1": [{ at: 1 }] };
    act(() => {
      mock.findChannel("viewers").emit("sync", undefined);
    });
    expect(result.current).toBe(1);

    mock.state.presence.viewers = {};
    act(() => {
      mock.findChannel("viewers").emit("sync", undefined);
    });
    expect(result.current).toBe(0);
  });
});
