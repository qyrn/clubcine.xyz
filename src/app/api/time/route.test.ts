import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "./route";

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/time", () => {
  it("renvoie l'heure serveur courante sous la forme {t}", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T12:00:00Z"));
    const res = GET();
    const data = (await res.json()) as { t: number };
    expect(data.t).toBe(Date.parse("2026-09-04T12:00:00Z"));
  });

  it("renvoie le header cache-control no-store", async () => {
    const res = GET();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
