import { describe, expect, it } from "vitest";
import { getCurrentSchedule, formatDuration, getProgrammeForHours } from "./schedule-engine";
import { FILMS, CYCLE_EPOCH } from "@/data/schedule";
import { SOIREES, getResolvedSoirees } from "@/data/soirees";

const SLOT = 30 * 60;

function alignToSlot(seconds: number): number {
  const rem = seconds % SLOT;
  return rem === 0 ? seconds : seconds + (SLOT - rem);
}

const TOTAL_CYCLE = FILMS.reduce((acc, f) => acc + alignToSlot(f.duration), 0);

describe("formatDuration", () => {
  it("formats hours+minutes when >=1h", () => {
    expect(formatDuration(3600)).toBe("1h00");
    expect(formatDuration(3725)).toBe("1h02");
  });

  it("formats minutes:seconds when <1h", () => {
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(59)).toBe("0:59");
  });
});

describe("getCurrentSchedule · cycle normal", () => {
  it("retourne le premier film à CYCLE_EPOCH (avant toute soirée)", () => {
    const s = getCurrentSchedule(CYCLE_EPOCH);
    expect(s.currentFilm.id).toBe(FILMS[0].id);
    expect(s.currentOffset).toBeGreaterThanOrEqual(0);
    expect(s.currentOffset).toBeLessThan(60);
    expect(s.intermission).toBeNull();
    expect(s.soiree).toBeNull();
    expect(s.totalCycleDuration).toBe(TOTAL_CYCLE);
  });

  it("retourne le second film à un offset > durée du premier slot", () => {
    const firstSlot = alignToSlot(FILMS[0].duration);
    const s = getCurrentSchedule(CYCLE_EPOCH + (firstSlot + 60) * 1000);
    expect(s.currentFilm.id).toBe(FILMS[1].id);
    expect(s.currentOffset).toBeGreaterThan(0);
  });

  it("currentOffset reste dans [0, duration] et currentFilm est valide", () => {
    const offsets = [0, 600, 3600, 7200, 12000, 50_000];
    for (const off of offsets) {
      const s = getCurrentSchedule(CYCLE_EPOCH + off * 1000);
      expect(FILMS.some((f) => f.id === s.currentFilm.id)).toBe(true);
      expect(s.currentOffset).toBeGreaterThanOrEqual(0);
      expect(s.currentOffset).toBeLessThanOrEqual(s.currentFilm.duration);
    }
  });

  it("nextFilms a au moins 1 entrée et toutes les startTime sont futures", () => {
    const now = CYCLE_EPOCH + 3600_000;
    const s = getCurrentSchedule(now, 6);
    expect(s.nextFilms.length).toBeGreaterThan(0);
    for (const e of s.nextFilms) {
      expect(e.startTime).toBeGreaterThanOrEqual(now);
      expect(FILMS.some((f) => f.id === e.film.id)).toBe(true);
    }
  });

  it("le cycle wrap correctement après totalCycleDuration", () => {
    const past = getCurrentSchedule(CYCLE_EPOCH + 100 * 1000);
    const future = getCurrentSchedule(CYCLE_EPOCH + (TOTAL_CYCLE + 100) * 1000);
    expect(future.currentFilm.id).toBe(past.currentFilm.id);
  });
});

describe("getCurrentSchedule · intermission", () => {
  it("détecte l'intermission entre deux films quand le slot a un padding", () => {
    const film0 = FILMS[0];
    const slot0 = alignToSlot(film0.duration);
    if (slot0 === film0.duration) {
      return;
    }
    const interPoint = film0.duration + Math.floor((slot0 - film0.duration) / 2);
    const s = getCurrentSchedule(CYCLE_EPOCH + interPoint * 1000);
    expect(s.intermission).not.toBeNull();
    if (!s.intermission || !s.intermission.prevFilm) return;
    expect(s.intermission.prevFilm.id).toBe(film0.id);
    expect(s.currentFilm.id).toBe(FILMS[1].id);
    expect(s.currentOffset).toBe(0);
    expect(s.intermission.secondsLeft).toBeGreaterThan(0);
  });
});

describe("getCurrentSchedule · soirée", () => {
  const firstSoiree = SOIREES[0];
  const resolved = getResolvedSoirees();
  const firstResolved = resolved[0];

  it("active la soirée pendant son créneau", () => {
    const midMs = (firstResolved.startSec + 60) * 1000;
    const s = getCurrentSchedule(midMs);
    expect(s.soiree).not.toBeNull();
    expect(s.soiree?.id).toBe(firstSoiree.id);
    expect(s.soiree?.films.length).toBe(firstSoiree.films.length);
  });

  it("upcomingSoirees expose les soirées futures dans l'ordre", () => {
    const beforeFirst = (firstResolved.startSec - 7 * 24 * 3600) * 1000;
    const s = getCurrentSchedule(beforeFirst);
    expect(s.upcomingSoirees.length).toBeGreaterThan(0);
    expect(s.upcomingSoirees[0].id).toBe(firstSoiree.id);
    for (let i = 1; i < s.upcomingSoirees.length; i++) {
      expect(s.upcomingSoirees[i].startsAt).toBeGreaterThanOrEqual(
        s.upcomingSoirees[i - 1].startsAt,
      );
    }
  });

  it("ne se ferme pas instantanément (endsAt > startsAt)", () => {
    const s = getCurrentSchedule((firstResolved.startSec + 60) * 1000);
    expect(s.soiree).not.toBeNull();
    if (s.soiree) {
      expect(s.soiree.endsAt).toBeGreaterThan(s.soiree.startsAt);
    }
  });
});

describe("getCurrentSchedule · rattrapage après soirée", () => {
  const resolved = getResolvedSoirees();
  const firstResolved = resolved[0];
  const secondResolved = resolved[1];

  it("reprend le cycle exactement là où il s'était arrêté avant la soirée, sans sauter sa durée", () => {
    const before = getCurrentSchedule((firstResolved.startSec - 1) * 1000);
    const after = getCurrentSchedule((firstResolved.endSec + 1) * 1000);

    expect(before.soiree).toBeNull();
    expect(after.soiree).toBeNull();
    expect(after.currentFilm.id).toBe(before.currentFilm.id);
    expect(after.currentOffset).toBeCloseTo(before.currentOffset + 2, 0);
  });

  it("absorbe la durée cumulée de deux soirées passées, pas seulement la dernière", () => {
    // Enchaîne la même propriété (reprise sans saut) autour de chaque soirée : au moment où
    // la 2e soirée se termine, computePausedSeconds doit avoir déjà compté la 1re en plus de
    // la 2e, sinon le cycle aurait avancé en trop entre les deux (durée de la 1re soirée en trop).
    const beforeFirst = getCurrentSchedule((firstResolved.startSec - 1) * 1000);
    const afterFirst = getCurrentSchedule((firstResolved.endSec + 1) * 1000);
    expect(afterFirst.currentFilm.id).toBe(beforeFirst.currentFilm.id);
    expect(afterFirst.currentOffset).toBeCloseTo(beforeFirst.currentOffset + 2, 0);

    const beforeSecond = getCurrentSchedule((secondResolved.startSec - 1) * 1000);
    const afterSecond = getCurrentSchedule((secondResolved.endSec + 1) * 1000);
    expect(beforeSecond.soiree).toBeNull();
    expect(afterSecond.soiree).toBeNull();
    expect(afterSecond.currentFilm.id).toBe(beforeSecond.currentFilm.id);
    expect(afterSecond.currentOffset).toBeCloseTo(beforeSecond.currentOffset + 2, 0);
  });
});

describe("getProgrammeForHours", () => {
  it("retourne au moins le film courant", () => {
    const list = getProgrammeForHours(1, CYCLE_EPOCH);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].startTime).toBe(CYCLE_EPOCH);
  });

  it("ordre temporel strictement croissant", () => {
    const list = getProgrammeForHours(24, CYCLE_EPOCH);
    for (let i = 1; i < list.length; i++) {
      expect(list[i].startTime).toBeGreaterThan(list[i - 1].startTime);
    }
  });
});
