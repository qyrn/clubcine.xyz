import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { isSiteLocked } from "@/lib/launch";
import { proxy } from "@/proxy";

vi.mock("@/lib/launch", () => ({ isSiteLocked: vi.fn() }));

const mockIsSiteLocked = vi.mocked(isSiteLocked);

function request(path: string): NextRequest {
  return new NextRequest(new URL(`https://clubcine.xyz${path}`));
}

function rewriteTarget(res: Response): string | null {
  return res.headers.get("x-middleware-rewrite");
}

beforeEach(() => {
  mockIsSiteLocked.mockReset();
});

describe("proxy (verrou pré-lancement)", () => {
  it("laisse tout passer quand le site n'est pas verrouillé", () => {
    mockIsSiteLocked.mockReturnValue(false);
    const res = proxy(request("/movie"));
    expect(rewriteTarget(res)).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("réécrit les pages et les API vers /soon quand verrouillé", () => {
    mockIsSiteLocked.mockReturnValue(true);
    expect(rewriteTarget(proxy(request("/")))).toMatch(/\/soon$/);
    expect(rewriteTarget(proxy(request("/movie")))).toMatch(/\/soon$/);
    expect(rewriteTarget(proxy(request("/api/schedule")))).toMatch(/\/soon$/);
  });

  it("laisse passer /soon, sa carte OG et /api/health même verrouillé", () => {
    mockIsSiteLocked.mockReturnValue(true);
    for (const path of ["/soon", "/soon/opengraph-image", "/api/health"]) {
      expect(rewriteTarget(proxy(request(path)))).toBeNull();
    }
  });
});
