import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Film } from "@/types";
import { getProgrammeForHours } from "@/lib/schedule-engine";
import { GET } from "./route";

vi.mock("@/lib/schedule-engine", () => ({ getProgrammeForHours: vi.fn() }));

const mockGetProgramme = vi.mocked(getProgrammeForHours);

function request(qs = ""): NextRequest {
  return new NextRequest(`https://clubcine.xyz/api/programme${qs}`);
}

function film(id: string): Film {
  return {
    id,
    title: id,
    director: "Réal",
    year: 2000,
    duration: 3600,
    url: `https://cdn.test/${id}/master.m3u8`,
  };
}

beforeEach(() => {
  mockGetProgramme.mockReset();
  mockGetProgramme.mockReturnValue([]);
});

describe("GET /api/programme", () => {
  it("utilise 24h par défaut si hours absent", () => {
    GET(request());
    expect(mockGetProgramme).toHaveBeenCalledWith(24);
  });

  it("utilise 24h par défaut si hours n'est pas un nombre", () => {
    GET(request("?hours=abc"));
    expect(mockGetProgramme).toHaveBeenCalledWith(24);
  });

  it("passe hours tel quel s'il est dans [1,72]", () => {
    GET(request("?hours=10"));
    expect(mockGetProgramme).toHaveBeenCalledWith(10);
  });

  it("clampe hours à 1 minimum", () => {
    GET(request("?hours=0"));
    expect(mockGetProgramme).toHaveBeenCalledWith(1);
    GET(request("?hours=-5"));
    expect(mockGetProgramme).toHaveBeenCalledWith(1);
  });

  it("clampe hours à 72 maximum", () => {
    GET(request("?hours=1000"));
    expect(mockGetProgramme).toHaveBeenCalledWith(72);
  });

  it("renvoie items, serverTime et hours dans la réponse", async () => {
    mockGetProgramme.mockReturnValue([{ film: film("a"), startTime: 1000 }]);
    const res = GET(request("?hours=10"));
    const data = (await res.json()) as { items: unknown; serverTime: number; hours: number };
    expect(data.hours).toBe(10);
    expect(typeof data.serverTime).toBe("number");
    expect(data.items).toEqual([{ film: film("a"), startTime: 1000 }]);
  });
});
