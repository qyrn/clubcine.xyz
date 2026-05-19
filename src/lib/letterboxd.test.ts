import { describe, expect, it } from "vitest";
import {
  normalizeLetterboxdProfile,
  normalizeLetterboxdFilm,
  letterboxdProfileHandle,
  letterboxdFilmSlug,
} from "./letterboxd";

describe("normalizeLetterboxdProfile", () => {
  it("returns empty string for empty input", () => {
    expect(normalizeLetterboxdProfile("")).toBe("");
    expect(normalizeLetterboxdProfile("   ")).toBe("");
  });

  it("accepts a bare handle", () => {
    expect(normalizeLetterboxdProfile("davidlynch")).toBe("https://letterboxd.com/davidlynch/");
  });

  it("accepts a full letterboxd url", () => {
    expect(normalizeLetterboxdProfile("https://letterboxd.com/davidlynch/")).toBe(
      "https://letterboxd.com/davidlynch/",
    );
  });

  it("normalizes a url without protocol", () => {
    expect(normalizeLetterboxdProfile("letterboxd.com/davidlynch")).toBe(
      "https://letterboxd.com/davidlynch/",
    );
  });

  it("rejects urls from other hosts (anti-phishing)", () => {
    expect(normalizeLetterboxdProfile("https://evil.com/davidlynch")).toBe("");
    expect(normalizeLetterboxdProfile("https://letterboxd-evil.com/davidlynch")).toBe("");
  });

  it("accepts letterboxd subdomains", () => {
    expect(normalizeLetterboxdProfile("https://www.letterboxd.com/davidlynch/")).toBe(
      "https://letterboxd.com/davidlynch/",
    );
  });

  it("rejects javascript: payloads", () => {
    expect(normalizeLetterboxdProfile("javascript:alert(1)//.com")).toBe("");
  });

  it("rejects invalid handles", () => {
    expect(normalizeLetterboxdProfile("with spaces")).toBe("");
    expect(normalizeLetterboxdProfile("with/slash")).toBe("");
  });
});

describe("normalizeLetterboxdFilm", () => {
  it("accepts a bare slug", () => {
    expect(normalizeLetterboxdFilm("mulholland-drive")).toBe(
      "https://letterboxd.com/film/mulholland-drive/",
    );
  });

  it("accepts an imdb id", () => {
    expect(normalizeLetterboxdFilm("tt0166924")).toBe("https://letterboxd.com/imdb/tt0166924/");
  });

  it("accepts a full film url", () => {
    expect(normalizeLetterboxdFilm("https://letterboxd.com/film/mulholland-drive/")).toBe(
      "https://letterboxd.com/film/mulholland-drive/",
    );
  });

  it("accepts an imdb url", () => {
    expect(normalizeLetterboxdFilm("https://letterboxd.com/imdb/tt0166924/")).toBe(
      "https://letterboxd.com/imdb/tt0166924/",
    );
  });

  it("rejects urls from other hosts", () => {
    expect(normalizeLetterboxdFilm("https://evil.com/film/mulholland-drive/")).toBe("");
  });
});

describe("letterboxdProfileHandle", () => {
  it("extracts the handle from a normalized url", () => {
    expect(letterboxdProfileHandle("https://letterboxd.com/davidlynch/")).toBe("davidlynch");
  });

  it("returns the raw input when not a valid url", () => {
    expect(letterboxdProfileHandle("davidlynch")).toBe("davidlynch");
  });
});

describe("letterboxdFilmSlug", () => {
  it("extracts the film slug", () => {
    expect(letterboxdFilmSlug("https://letterboxd.com/film/mulholland-drive/")).toBe(
      "mulholland-drive",
    );
  });

  it("extracts the imdb id path", () => {
    expect(letterboxdFilmSlug("https://letterboxd.com/imdb/tt0166924/")).toBe("imdb/tt0166924");
  });
});
