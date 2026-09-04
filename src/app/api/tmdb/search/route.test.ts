import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function request(qs = ""): NextRequest {
  return new NextRequest(`https://clubcine.xyz/api/tmdb/search${qs}`);
}

beforeEach(() => {
  vi.stubEnv("TMDB_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/tmdb/search", () => {
  it("renvoie 503 si TMDB_API_KEY absent", async () => {
    vi.stubEnv("TMDB_API_KEY", "");
    const res = await GET(request("?q=blade"));
    expect(res.status).toBe(503);
  });

  it("renvoie [] si q absent", async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ results: [] });
  });

  it("renvoie [] si q fait moins de 2 caractères", async () => {
    const res = await GET(request("?q=a"));
    expect(await res.json()).toEqual({ results: [] });
  });

  it("mappe les résultats TMDB en succès", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 1,
              title: "Titre FR",
              original_title: "Original",
              release_date: "1999-05-01",
              poster_path: "/p.jpg",
              overview: "desc",
            },
            {
              id: 2,
              title: "",
              original_title: "Only Original",
              release_date: "",
              poster_path: null,
              overview: "",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(request("?q=blade"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { results: unknown[] };
    expect(data.results).toEqual([
      {
        id: 1,
        title: "Titre FR",
        originalTitle: "Original",
        year: "1999",
        posterUrl: "https://image.tmdb.org/t/p/w342/p.jpg",
        overview: "desc",
      },
      {
        id: 2,
        title: "Only Original",
        originalTitle: "Only Original",
        year: null,
        posterUrl: null,
        overview: "",
      },
    ]);
  });

  it("limite les résultats à 8", async () => {
    const results = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      title: `Film ${i}`,
      original_title: `Film ${i}`,
      release_date: "2020-01-01",
      poster_path: null,
      overview: "",
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ results }), { status: 200 })),
    );
    const res = await GET(request("?q=blade"));
    const data = (await res.json()) as { results: unknown[] };
    expect(data.results).toHaveLength(8);
  });

  it("renvoie 502 si TMDB répond en erreur", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    const res = await GET(request("?q=blade"));
    expect(res.status).toBe(502);
    expect((await res.json()) as { error: string }).toEqual({ error: "TMDB 500" });
  });

  it("renvoie 502 si le fetch échoue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const res = await GET(request("?q=blade"));
    expect(res.status).toBe(502);
    expect((await res.json()) as { error: string }).toEqual({ error: "network down" });
  });
});
