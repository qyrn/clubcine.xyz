import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { FILMS } from "@/data/schedule";
import { SOIREES } from "@/data/soirees";

describe("FILMS", () => {
  it("contient exactement 100 films", () => {
    expect(FILMS.length).toBe(100);
  });

  it("a des id tous uniques", () => {
    const ids = FILMS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a des durations finies et positives", () => {
    for (const film of FILMS) {
      expect(Number.isFinite(film.duration)).toBe(true);
      expect(film.duration).toBeGreaterThan(0);
    }
  });

  it("référence un poster existant sur disque pour chaque film qui en déclare un", () => {
    for (const film of FILMS) {
      if (!film.poster) continue;
      const posterPath = path.join(process.cwd(), "public", film.poster);
      expect(fs.existsSync(posterPath), `poster manquant pour ${film.id} : ${film.poster}`).toBe(true);
    }
  });
});

describe("SOIREES", () => {
  it("ne référence que des films existants dans FILMS", () => {
    const knownIds = new Set(FILMS.map((f) => f.id));
    for (const soiree of SOIREES) {
      for (const filmId of soiree.films) {
        expect(knownIds.has(filmId), `film inconnu "${filmId}" dans la soirée ${soiree.id}`).toBe(true);
      }
    }
  });
});
