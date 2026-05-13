import { FILMS } from "@/data/schedule";
import type { Film } from "@/types";

export interface SoireeDef {
  id: string;
  title: string;
  subtitle?: string;
  films: string[];
  startISO: string;
  creditedSuggestionId?: string;
  creditedUsername?: string;
  posterFilmId?: string;
  posterCustomUrl?: string;
}

export const SOIREES_TIMEZONE = "Europe/Paris";

export const SOIREES: SoireeDef[] = [
  {
    id: "2026-05-16-affaires-non-classees",
    title: "Affaires non classées",
    films: ["manhunter", "seven", "zodiac"],
    startISO: "2026-05-16T21:00:00+02:00",
    posterFilmId: "zodiac",
  },
  {
    id: "2026-05-23-mauvais-plan",
    title: "Mauvais plan",
    films: ["dog-day-afternoon", "heat", "good-time"],
    startISO: "2026-05-23T21:00:00+02:00",
    posterFilmId: "heat",
  },
  {
    id: "2026-05-30-histoires-de-famille",
    title: "Histoires de famille",
    films: ["magnolia", "shoplifters", "family-resemblances"],
    startISO: "2026-05-30T21:00:00+02:00",
    posterFilmId: "shoplifters",
  },
  {
    id: "2026-06-06-le-vieux-pays",
    title: "Le vieux pays",
    films: ["jesse-james", "no-country-for-old-men", "killers-of-the-flower-moon"],
    startISO: "2026-06-06T21:00:00+02:00",
    posterFilmId: "killers-of-the-flower-moon",
  },
];

export interface ResolvedSoiree {
  def: SoireeDef;
  films: Film[];
  startSec: number;
  durationSec: number;
  endSec: number;
}

const SLOT_SECONDS = 30 * 60;

let cached: ResolvedSoiree[] | null = null;
let cachedKey = "";

export function getResolvedSoirees(): ResolvedSoiree[] {
  const key = SOIREES.map((s) => `${s.id}:${s.startISO}:${s.films.join(",")}`).join("|");
  if (cached && cachedKey === key) return cached;

  const filmsById = new Map(FILMS.map((f) => [f.id, f]));
  const resolved: ResolvedSoiree[] = SOIREES.map((def) => {
    const films = def.films.map((id) => {
      const f = filmsById.get(id);
      if (!f) throw new Error(`Soirée ${def.id} référence un film inconnu : ${id}`);
      return f;
    });
    const startMs = Date.parse(def.startISO);
    if (Number.isNaN(startMs)) throw new Error(`Soirée ${def.id} : startISO invalide`);
    const startSec = Math.floor(startMs / 1000);

    let durationSec = 0;
    for (let i = 0; i < films.length; i++) {
      durationSec += films[i].duration;
      if (i < films.length - 1) {
        const rem = durationSec % SLOT_SECONDS;
        if (rem !== 0) durationSec += SLOT_SECONDS - rem;
      }
    }
    const totalRem = durationSec % SLOT_SECONDS;
    if (totalRem !== 0) durationSec += SLOT_SECONDS - totalRem;

    return { def, films, startSec, durationSec, endSec: startSec + durationSec };
  });

  resolved.sort((a, b) => a.startSec - b.startSec);

  for (let i = 1; i < resolved.length; i++) {
    if (resolved[i].startSec < resolved[i - 1].endSec) {
      throw new Error(
        `Soirées chevauchantes : ${resolved[i - 1].def.id} se termine après le début de ${resolved[i].def.id}`,
      );
    }
  }

  cached = resolved;
  cachedKey = key;
  return resolved;
}
