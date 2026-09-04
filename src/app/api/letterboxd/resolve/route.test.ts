import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function request(qs = ""): NextRequest {
  return new NextRequest(`https://clubcine.xyz/api/letterboxd/resolve${qs}`);
}

function fakeFetchResponse(url: string): Response {
  return { url } as unknown as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fetch ne devrait pas être appelé")));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/letterboxd/resolve", () => {
  it("rejette les formats imdb invalides", async () => {
    for (const qs of ["", "?imdb=123", "?imdb=ttABC", "?imdb=TT123", "?imdb=tt"]) {
      const res = await GET(request(qs));
      expect(res.status).toBe(400);
    }
  });

  it("résout un imdb valide vers son slug letterboxd", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(fakeFetchResponse("https://letterboxd.com/film/mulholland-drive/")),
    );
    const res = await GET(request("?imdb=tt0166924"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      slug: "mulholland-drive",
      finalUrl: "https://letterboxd.com/film/mulholland-drive/",
    });
  });

  it("renvoie slug null si l'url finale ne correspond pas à un film", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(fakeFetchResponse("https://letterboxd.com/imdb/tt0166924/")),
    );
    const res = await GET(request("?imdb=tt0166924"));
    const data = (await res.json()) as { slug: string | null };
    expect(data.slug).toBeNull();
  });

  it("renvoie slug null si le fetch échoue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    const res = await GET(request("?imdb=tt0166924"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ slug: null });
  });
});
