import { describe, expect, it } from "vitest";
import {
  normalizeTwitter,
  normalizeInstagram,
  twitterHandle,
  instagramHandle,
} from "./socials";

describe("normalizeTwitter", () => {
  it("accepts a bare handle", () => {
    expect(normalizeTwitter("davidlynch")).toBe("https://x.com/davidlynch/");
  });

  it("strips a leading @", () => {
    expect(normalizeTwitter("@davidlynch")).toBe("https://x.com/davidlynch/");
  });

  it("accepts x.com urls", () => {
    expect(normalizeTwitter("https://x.com/davidlynch")).toBe("https://x.com/davidlynch/");
  });

  it("accepts twitter.com urls and rewrites to x.com", () => {
    expect(normalizeTwitter("https://twitter.com/davidlynch")).toBe("https://x.com/davidlynch/");
  });

  it("rejects other hosts", () => {
    expect(normalizeTwitter("https://evil.com/davidlynch")).toBe("");
    expect(normalizeTwitter("https://x-evil.com/davidlynch")).toBe("");
  });

  it("rejects javascript: payloads", () => {
    expect(normalizeTwitter("javascript:alert(1)")).toBe("");
  });

  it("accepts subdomains of x.com", () => {
    expect(normalizeTwitter("https://www.x.com/davidlynch")).toBe("https://x.com/davidlynch/");
  });
});

describe("normalizeInstagram", () => {
  it("accepts a bare handle", () => {
    expect(normalizeInstagram("davidlynch")).toBe("https://instagram.com/davidlynch/");
  });

  it("accepts instagram.com urls", () => {
    expect(normalizeInstagram("https://instagram.com/davidlynch")).toBe(
      "https://instagram.com/davidlynch/",
    );
  });

  it("rejects other hosts", () => {
    expect(normalizeInstagram("https://evil.com/davidlynch")).toBe("");
  });

  it("accepts subdomains of instagram.com", () => {
    expect(normalizeInstagram("https://www.instagram.com/davidlynch")).toBe(
      "https://instagram.com/davidlynch/",
    );
  });
});

describe("twitterHandle / instagramHandle", () => {
  it("extract the handle from normalized urls", () => {
    expect(twitterHandle("https://x.com/davidlynch/")).toBe("davidlynch");
    expect(instagramHandle("https://instagram.com/davidlynch/")).toBe("davidlynch");
  });
});
