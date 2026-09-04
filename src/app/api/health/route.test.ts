import { describe, it, expect, vi, beforeEach } from "vitest";
import { isSiteLocked } from "@/lib/launch";
import { GET, HEAD } from "./route";

vi.mock("@/lib/launch", () => ({ isSiteLocked: vi.fn() }));

const mockIsSiteLocked = vi.mocked(isSiteLocked);

beforeEach(() => {
  mockIsSiteLocked.mockReset();
});

describe("GET /api/health", () => {
  it("renvoie status, locked et timestamp", async () => {
    mockIsSiteLocked.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = (await res.json()) as { status: string; locked: boolean; timestamp: number };
    expect(data.status).toBe("ok");
    expect(data.locked).toBe(false);
    expect(typeof data.timestamp).toBe("number");
    expect(res.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("reflète l'état verrouillé de isSiteLocked", async () => {
    mockIsSiteLocked.mockReturnValue(true);
    const res = await GET();
    const data = (await res.json()) as { locked: boolean };
    expect(data.locked).toBe(true);
  });
});

describe("HEAD /api/health", () => {
  it("renvoie 200 sans corps", async () => {
    const res = await HEAD();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
    expect(res.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });
});
