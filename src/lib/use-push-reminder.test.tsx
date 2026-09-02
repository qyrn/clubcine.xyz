/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from } }));

import { usePushReminder } from "@/lib/use-push-reminder";

const upsert = vi.fn(async () => ({ error: null }));
const del = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));

let pushSub: unknown;
const subscribe = vi.fn(async () => ({
  toJSON: () => ({ endpoint: "https://push.example/abc", keys: { p256dh: "p", auth: "a" } }),
}));
const getSubscription = vi.fn(async () => pushSub);

beforeEach(() => {
  vi.stubEnv(
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "BFakeVapidKey_-_test0000000000000000000000000000000000000000",
  );
  from.mockImplementation((table: string) => {
    expect(table).toBe("push_subscriptions");
    return { upsert, delete: del };
  });
  upsert.mockClear();
  subscribe.mockClear();
  pushSub = null;

  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager: { getSubscription, subscribe } }) },
  });
  (window as unknown as { PushManager: unknown }).PushManager = function () {};
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: Object.assign(
      vi.fn(),
      { permission: "default", requestPermission: vi.fn(async () => "granted") },
    ),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("usePushReminder", () => {
  it("détecte l'absence de souscription → statut default", async () => {
    const { result } = renderHook(() => usePushReminder(null));
    await waitFor(() => expect(result.current.status).toBe("default"));
  });

  it("détecte une souscription existante → statut subscribed", async () => {
    pushSub = { endpoint: "x", unsubscribe: vi.fn() };
    const { result } = renderHook(() => usePushReminder(null));
    await waitFor(() => expect(result.current.status).toBe("subscribed"));
  });

  it("subscribe demande la permission, s'abonne et upsert l'endpoint", async () => {
    const { result } = renderHook(() => usePushReminder("user-1"));
    await waitFor(() => expect(result.current.status).toBe("default"));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "https://push.example/abc", user_id: "user-1" }),
    );
    expect(result.current.status).toBe("subscribed");
  });
});
