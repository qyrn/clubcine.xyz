import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (fn: () => unknown) => {
      fn();
    },
  };
});

const SUPABASE_URL = "https://example.supabase.co";
const SUPABASE_ANON = "anon-key";

function request(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("https://clubcine.xyz/api/reactions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function invalidJsonRequest(ip = "1.2.3.4"): NextRequest {
  return new NextRequest("https://clubcine.xyz/api/reactions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: "not json",
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

async function loadRoute() {
  return import("./route");
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", SUPABASE_ANON);
  fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/reactions", () => {
  it("renvoie 400 pour un JSON invalide", async () => {
    const { POST } = await loadRoute();
    const res = await POST(invalidJsonRequest());
    expect(res.status).toBe(400);
  });

  it("filtre les slugs par regex et ne diffuse que les valides", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      request({ slugs: ["mulholland-drive", "BAD SLUG", "x", "a".repeat(40), "ok-2"] }),
    );
    expect(res.status).toBe(200);

    await vi.advanceTimersByTimeAsync(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${SUPABASE_URL}/realtime/v1/api/broadcast`);
    const body = JSON.parse(init.body as string) as {
      messages: [{ payload: { slugs: string[] } }];
    };
    expect(body.messages[0].payload.slugs).toEqual(["mulholland-drive", "ok-2"]);
  });

  it("agrège plusieurs requêtes dans le même buffer avant flush", async () => {
    const { POST } = await loadRoute();
    await POST(request({ slugs: ["film-un"] }));
    await POST(request({ slugs: ["film-deux"] }));

    await vi.advanceTimersByTimeAsync(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      messages: [{ payload: { slugs: string[] } }];
    };
    expect(body.messages[0].payload.slugs).toEqual(["film-un", "film-deux"]);
  });

  it("plafonne le buffer à 300 entrées", async () => {
    const { POST } = await loadRoute();
    const slugs = Array.from({ length: 350 }, (_, i) => `slug-${i}`);
    const res = await POST(request({ slugs }));
    expect(res.status).toBe(200);

    await vi.advanceTimersByTimeAsync(200);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      messages: [{ payload: { slugs: string[] } }];
    };
    expect(body.messages[0].payload.slugs).toHaveLength(300);
  });

  it("rate limite à 60 requêtes par IP sur 10s puis renvoie 429", async () => {
    const { POST } = await loadRoute();
    const ip = "9.9.9.9";
    for (let i = 0; i < 60; i++) {
      const res = await POST(request({ slugs: [] }, ip));
      expect(res.status).toBe(200);
    }
    const blocked = await POST(request({ slugs: [] }, ip));
    expect(blocked.status).toBe(429);
  });

  it("n'affecte pas les IP différentes par le rate limit", async () => {
    const { POST } = await loadRoute();
    for (let i = 0; i < 60; i++) {
      await POST(request({ slugs: [] }, "1.1.1.1"));
    }
    const other = await POST(request({ slugs: [] }, "2.2.2.2"));
    expect(other.status).toBe(200);
  });

  it("réautorise une IP après l'expiration de la fenêtre de 10s", async () => {
    const { POST } = await loadRoute();
    const ip = "8.8.8.8";
    for (let i = 0; i < 60; i++) {
      await POST(request({ slugs: [] }, ip));
    }
    const blocked = await POST(request({ slugs: [] }, ip));
    expect(blocked.status).toBe(429);

    vi.setSystemTime(Date.now() + 10_000);

    const afterWindow = await POST(request({ slugs: [] }, ip));
    expect(afterWindow.status).toBe(200);
  });
});
