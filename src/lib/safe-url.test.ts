import { describe, expect, it } from "vitest";
import { safeImageUrl } from "./safe-url";

describe("safeImageUrl", () => {
  it("returns null for nullish or empty input", () => {
    expect(safeImageUrl(null)).toBeNull();
    expect(safeImageUrl(undefined)).toBeNull();
    expect(safeImageUrl("")).toBeNull();
    expect(safeImageUrl("   ")).toBeNull();
  });

  it("accepts http and https urls", () => {
    expect(safeImageUrl("https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(safeImageUrl("http://example.com/a.png")).toBe("http://example.com/a.png");
  });

  it("rejects javascript: protocol", () => {
    expect(safeImageUrl("javascript:alert(1)")).toBeNull();
    expect(safeImageUrl("JavaScript:alert(1)")).toBeNull();
  });

  it("rejects data: protocol", () => {
    expect(safeImageUrl("data:image/png;base64,iVBORw0KGgo=")).toBeNull();
  });

  it("rejects exotic protocols", () => {
    expect(safeImageUrl("file:///etc/passwd")).toBeNull();
    expect(safeImageUrl("ftp://example.com/a.png")).toBeNull();
    expect(safeImageUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(safeImageUrl("not-a-url")).toBeNull();
    expect(safeImageUrl("/just/a/path.png")).toBeNull();
  });

  it("trims surrounding whitespace before parsing", () => {
    expect(safeImageUrl("  https://example.com/a.png  ")).toBe("https://example.com/a.png");
  });
});
