import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function request(qs = ""): NextRequest {
  return new NextRequest(`https://clubcine.xyz/api/tmdb/details${qs}`);
}

function mockFetchImplementation(detailsResponse: Response, imagesResponse: Response) {
  return vi.fn((url: string) => {
    if (url.includes("/images")) return Promise.resolve(imagesResponse);
    return Promise.resolve(detailsResponse);
  });
}

beforeEach(() => {
  vi.stubEnv("TMDB_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/tmdb/details", () => {
  it("renvoie 400 si id absent ou non numérique", async () => {
    expect((await GET(request())).status).toBe(400);
    expect((await GET(request("?id=abc"))).status).toBe(400);
    expect((await GET(request("?id=12a"))).status).toBe(400);
  });

  it("renvoie 503 si TMDB_API_KEY absent", async () => {
    vi.stubEnv("TMDB_API_KEY", "");
    const res = await GET(request("?id=42"));
    expect(res.status).toBe(503);
  });

  it("renvoie les détails et posters triés fr > en/null > autres, puis vote desc", async () => {
    const details = {
      id: 42,
      title: "Le Film",
      original_title: "The Movie",
      release_date: "2001-03-01",
      imdb_id: "tt0123456",
      poster_path: "/main.jpg",
    };
    const images = {
      posters: [
        { file_path: "/es.jpg", iso_639_1: "es", vote_average: 9, width: 1, height: 1 },
        { file_path: "/fr-low.jpg", iso_639_1: "fr", vote_average: 3, width: 1, height: 1 },
        { file_path: "/fr-high.jpg", iso_639_1: "fr", vote_average: 8, width: 1, height: 1 },
        { file_path: "/en.jpg", iso_639_1: "en", vote_average: 7, width: 1, height: 1 },
      ],
    };
    vi.stubGlobal(
      "fetch",
      mockFetchImplementation(
        new Response(JSON.stringify(details), { status: 200 }),
        new Response(JSON.stringify(images), { status: 200 }),
      ),
    );

    const res = await GET(request("?id=42"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      id: number;
      title: string;
      year: string | null;
      imdbId: string | null;
      posters: string[];
    };
    expect(data.id).toBe(42);
    expect(data.title).toBe("Le Film");
    expect(data.year).toBe("2001");
    expect(data.imdbId).toBe("tt0123456");
    expect(data.posters[0]).toBe("https://image.tmdb.org/t/p/w342/main.jpg");
    expect(data.posters.slice(1)).toEqual([
      "https://image.tmdb.org/t/p/w342/fr-high.jpg",
      "https://image.tmdb.org/t/p/w342/fr-low.jpg",
      "https://image.tmdb.org/t/p/w342/en.jpg",
      "https://image.tmdb.org/t/p/w342/es.jpg",
    ]);
  });

  it("renvoie 502 si la requête details échoue", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchImplementation(
        new Response(null, { status: 404 }),
        new Response(JSON.stringify({ posters: [] }), { status: 200 }),
      ),
    );
    const res = await GET(request("?id=42"));
    expect(res.status).toBe(502);
  });

  it("retombe sur une liste de posters vide si la requête images échoue, garde le poster principal", async () => {
    const details = {
      id: 7,
      title: "T",
      original_title: "T",
      release_date: "2010-01-01",
      imdb_id: null,
      poster_path: "/only.jpg",
    };
    vi.stubGlobal(
      "fetch",
      mockFetchImplementation(
        new Response(JSON.stringify(details), { status: 200 }),
        new Response(null, { status: 500 }),
      ),
    );
    const res = await GET(request("?id=7"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { posters: string[] };
    expect(data.posters).toEqual(["https://image.tmdb.org/t/p/w342/only.jpg"]);
  });

  it("renvoie 502 si le fetch échoue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    const res = await GET(request("?id=42"));
    expect(res.status).toBe(502);
    expect((await res.json()) as { error: string }).toEqual({ error: "boom" });
  });
});
