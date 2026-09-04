import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));
const createClientMock = vi.fn(() => ({ from: fromMock }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

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
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/test";

let fetchMock: ReturnType<typeof vi.fn>;

function request(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://clubcine.xyz/api/log-error", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function invalidJsonRequest(): NextRequest {
  return new NextRequest("https://clubcine.xyz/api/log-error", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not json",
  });
}

async function loadRoute() {
  return import("./route");
}

function stubEnv(overrides: { supabase?: boolean; discord?: boolean } = {}) {
  const { supabase = true, discord = false } = overrides;
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabase ? SUPABASE_URL : "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", supabase ? SUPABASE_ANON : "");
  vi.stubEnv("DISCORD_ERROR_WEBHOOK_URL", discord ? DISCORD_WEBHOOK : "");
}

async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.resetModules();
  insertMock.mockReset();
  insertMock.mockResolvedValue({ error: null });
  fromMock.mockClear();
  createClientMock.mockClear();
  fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/log-error", () => {
  it("renvoie 503 si supabase n'est pas configuré", async () => {
    stubEnv({ supabase: false });
    const { POST } = await loadRoute();
    const res = await POST(request({ message: "boom" }));
    expect(res.status).toBe(503);
  });

  it("renvoie 400 pour un JSON invalide", async () => {
    stubEnv();
    const { POST } = await loadRoute();
    const res = await POST(invalidJsonRequest());
    expect(res.status).toBe(400);
  });

  it("renvoie 400 si message absent", async () => {
    stubEnv();
    const { POST } = await loadRoute();
    const res = await POST(request({}));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("renvoie 400 si message vide ou uniquement des espaces", async () => {
    stubEnv();
    const { POST } = await loadRoute();
    const res = await POST(request({ message: "   " }));
    expect(res.status).toBe(400);
  });

  it("insère l'erreur avec source par défaut 'client'", async () => {
    stubEnv();
    const { POST } = await loadRoute();
    const res = await POST(request({ message: "un souci" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fromMock).toHaveBeenCalledWith("error_log");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: "un souci", source: "client" }),
    );
  });

  it("clampe la longueur des champs texte", async () => {
    stubEnv();
    const { POST } = await loadRoute();
    await POST(
      request({
        message: "m".repeat(2000),
        source: "s".repeat(200),
        stack: "st".repeat(3000),
        url: "u".repeat(1000),
        userId: "id".repeat(100),
        username: "un".repeat(100),
      }),
    );
    const inserted = insertMock.mock.calls[0][0] as {
      message: string;
      source: string;
      stack: string;
      url: string;
      user_id: string;
      username: string;
    };
    expect(inserted.message).toHaveLength(1000);
    expect(inserted.source).toHaveLength(80);
    expect(inserted.stack).toHaveLength(4000);
    expect(inserted.url).toHaveLength(500);
    expect(inserted.user_id).toHaveLength(64);
    expect(inserted.username).toHaveLength(64);
  });

  it("dérive un username depuis x-forwarded-for si userId et username absents", async () => {
    stubEnv();
    const { POST } = await loadRoute();
    await POST(request({ message: "erreur" }, { "x-forwarded-for": "5.6.7.8, proxy" }));
    const inserted = insertMock.mock.calls[0][0] as { username: string | null };
    expect(inserted.username).toBe("ip:5.6.7.8");
  });

  it("garde username et userId fournis sans les écraser", async () => {
    stubEnv();
    const { POST } = await loadRoute();
    await POST(
      request(
        { message: "erreur", userId: "u1", username: "qyrn" },
        { "x-forwarded-for": "5.6.7.8" },
      ),
    );
    const inserted = insertMock.mock.calls[0][0] as { username: string | null; user_id: string | null };
    expect(inserted.username).toBe("qyrn");
    expect(inserted.user_id).toBe("u1");
  });

  it("ne renvoie jamais 500 : erreur d'insertion renvoie 200 ok:false", async () => {
    stubEnv();
    insertMock.mockResolvedValue({ error: { message: "insert failed" } });
    const { POST } = await loadRoute();
    const res = await POST(request({ message: "erreur" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false });
  });

  it("notifie discord via after() quand le webhook est configuré", async () => {
    stubEnv({ discord: true });
    const { POST } = await loadRoute();
    const res = await POST(request({ message: "erreur critique" }));
    expect(res.status).toBe(200);

    await tick();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(DISCORD_WEBHOOK);
    const payload = JSON.parse(init.body as string) as { embeds: [{ title: string }] };
    expect(payload.embeds[0].title).toBe("Erreur runtime · clubcine.xyz");
  });

  it("ne notifie pas discord deux fois pour le même message dans la fenêtre de dédoublonnage", async () => {
    stubEnv({ discord: true });
    const { POST } = await loadRoute();
    await POST(request({ message: "erreur répétée" }));
    await tick();
    await POST(request({ message: "erreur répétée" }));
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ne notifie pas discord si le webhook n'est pas configuré", async () => {
    stubEnv({ discord: false });
    const { POST } = await loadRoute();
    await POST(request({ message: "erreur" }));
    await tick();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
