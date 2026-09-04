/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createSupabaseMock } from "@/test/supabase-mock";

const mock = createSupabaseMock();
vi.mock("@/lib/supabase", () => ({ supabase: mock.client }));

const { useNotifications } = await import("@/lib/use-notifications");

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "n1",
    actor_id: "actor-1",
    actor_username: "varda",
    type: "follow",
    detail: null,
    read: false,
    created_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.reset();
  mock.state.handlers.notifications = () => ({ data: [] });
});

describe("useNotifications", () => {
  it("charge les notifications au montage", async () => {
    mock.state.handlers.notifications = (ctx) => {
      if (ctx.op === "select") return { data: [row()] };
      return { data: [] };
    };

    const { result } = renderHook(() => useNotifications("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({
      id: "n1",
      actorId: "actor-1",
      actorUsername: "varda",
      type: "follow",
      read: false,
    });
  });

  it("ajoute une notification reçue via le canal realtime", async () => {
    const { result } = renderHook(() => useNotifications("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      mock.findChannel("notifications:user-1").emit("INSERT", {
        new: row({ id: "n2", type: "mention", actor_username: "demy" }),
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({ id: "n2", type: "mention" });
  });

  it("ne duplique pas une notification déjà connue", async () => {
    mock.state.handlers.notifications = () => ({ data: [row({ id: "n1" })] });
    const { result } = renderHook(() => useNotifications("user-1"));
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));

    act(() => {
      mock.findChannel("notifications:user-1").emit("INSERT", { new: row({ id: "n1" }) });
    });

    expect(result.current.notifications).toHaveLength(1);
  });

  it("refetch au complet sur un visibilitychange", async () => {
    let calls = 0;
    mock.state.handlers.notifications = (ctx) => {
      if (ctx.op !== "select") return { data: [] };
      calls += 1;
      return { data: calls === 1 ? [row({ id: "n1" })] : [row({ id: "n1" }), row({ id: "n2" })] };
    };

    const { result } = renderHook(() => useNotifications("user-1"));
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    expect(calls).toBe(2);
  });
});
