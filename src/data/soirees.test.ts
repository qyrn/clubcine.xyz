import { describe, it, expect } from "vitest";
import type { Film } from "@/types";
import { resolveSoirees, getResolvedSoirees, type SoireeDef } from "@/data/soirees";

const HOUR = 3600;
const SLOT = 30 * 60;

function film(id: string, duration: number): Film {
  return {
    id,
    title: id,
    director: "Réal",
    year: 2000,
    duration,
    url: `https://cdn.test/${id}/master.m3u8`,
  };
}

function def(overrides: Partial<SoireeDef> & Pick<SoireeDef, "id" | "startISO">): SoireeDef {
  return { title: overrides.id, films: ["a"], ...overrides };
}

describe("resolveSoirees", () => {
  it("résout les films et calcule startSec", () => {
    const [s] = resolveSoirees(
      [def({ id: "s1", startISO: "2026-09-07T21:00:00+02:00", films: ["a", "b"] })],
      [film("a", HOUR), film("b", HOUR)],
    );
    expect(s.films.map((f) => f.id)).toEqual(["a", "b"]);
    expect(s.startSec).toBe(Math.floor(Date.parse("2026-09-07T21:00:00+02:00") / 1000));
  });

  it("arrondit la durée totale au créneau de 30 min supérieur", () => {
    const [s] = resolveSoirees(
      [def({ id: "s1", startISO: "2026-09-07T21:00:00Z", films: ["a"] })],
      [film("a", HOUR + 100)],
    );
    expect(s.durationSec).toBe(3 * SLOT);
    expect(s.endSec).toBe(s.startSec + s.durationSec);
  });

  it("arrondit chaque film au créneau avant d'enchaîner le suivant", () => {
    const [s] = resolveSoirees(
      [def({ id: "s1", startISO: "2026-09-07T21:00:00Z", films: ["a", "b"] })],
      [film("a", HOUR + 100), film("b", HOUR)],
    );
    expect(s.durationSec).toBe(3 * SLOT + 2 * SLOT);
  });

  it("trie les soirées par startSec", () => {
    const resolved = resolveSoirees(
      [
        def({ id: "late", startISO: "2026-09-20T21:00:00Z", films: ["a"] }),
        def({ id: "early", startISO: "2026-09-07T21:00:00Z", films: ["a"] }),
      ],
      [film("a", HOUR)],
    );
    expect(resolved.map((s) => s.def.id)).toEqual(["early", "late"]);
  });

  it("accepte deux soirées adjacentes (début = fin de la précédente)", () => {
    const first = resolveSoirees(
      [def({ id: "s1", startISO: "2026-09-07T21:00:00Z", films: ["a"] })],
      [film("a", HOUR)],
    )[0];
    const nextStartIso = new Date(first.endSec * 1000).toISOString();
    expect(() =>
      resolveSoirees(
        [
          def({ id: "s1", startISO: "2026-09-07T21:00:00Z", films: ["a"] }),
          def({ id: "s2", startISO: nextStartIso, films: ["a"] }),
        ],
        [film("a", HOUR)],
      ),
    ).not.toThrow();
  });

  it("lève une erreur sur un film inconnu", () => {
    expect(() =>
      resolveSoirees(
        [def({ id: "s1", startISO: "2026-09-07T21:00:00Z", films: ["ghost"] })],
        [film("a", HOUR)],
      ),
    ).toThrow(/film inconnu : ghost/);
  });

  it("lève une erreur sur un startISO invalide", () => {
    expect(() =>
      resolveSoirees(
        [def({ id: "s1", startISO: "pas une date", films: ["a"] })],
        [film("a", HOUR)],
      ),
    ).toThrow(/startISO invalide/);
  });

  it("lève une erreur sur des soirées qui se chevauchent", () => {
    expect(() =>
      resolveSoirees(
        [
          def({ id: "s1", startISO: "2026-09-07T21:00:00Z", films: ["a"] }),
          def({ id: "s2", startISO: "2026-09-07T21:15:00Z", films: ["a"] }),
        ],
        [film("a", HOUR)],
      ),
    ).toThrow(/chevauchantes/);
  });
});

describe("getResolvedSoirees (données réelles)", () => {
  it("résout le catalogue sans erreur", () => {
    const resolved = getResolvedSoirees();
    expect(resolved.length).toBeGreaterThan(0);
    for (let i = 1; i < resolved.length; i++) {
      expect(resolved[i].startSec).toBeGreaterThanOrEqual(resolved[i - 1].endSec);
    }
  });

  it("met en cache le résultat", () => {
    expect(getResolvedSoirees()).toBe(getResolvedSoirees());
  });
});
