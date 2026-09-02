/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createSupabaseMock } from "@/test/supabase-mock";

const mock = createSupabaseMock();
vi.mock("@/lib/supabase", () => ({ supabase: mock.client }));

const { useDonationStats } = await import("@/lib/use-donation-stats");

beforeEach(() => {
  vi.clearAllMocks();
  mock.reset();
  mock.state.handlers.donations = (ctx) => {
    const scopedToMonth = ctx.filters.some((f) => f.method === "gte");
    return { count: scopedToMonth ? 2 : 5, error: null };
  };
});

describe("useDonationStats", () => {
  it("charge le total et le compte du mois", async () => {
    const { result } = renderHook(() => useDonationStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.total).toBe(5);
    expect(result.current.thisMonth).toBe(2);
    expect(result.current.error).toBe(false);
  });

  it("incrémente en direct sur un INSERT realtime", async () => {
    const { result } = renderHook(() => useDonationStats());
    await waitFor(() => expect(result.current.total).toBe(5));

    act(() => {
      mock.findChannel("donations").emit("INSERT", {
        new: { created_at: new Date().toISOString() },
      });
    });

    expect(result.current.total).toBe(6);
    expect(result.current.thisMonth).toBe(3);
  });

  it("passe en erreur si la requête échoue", async () => {
    mock.state.handlers.donations = () => ({ count: null, error: { message: "boom" } });
    const { result } = renderHook(() => useDonationStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
  });
});
