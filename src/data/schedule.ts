import { Film } from "@/types";

export const FILMS: Film[] = [
  {
    id: "nosferatu",
    title: "Nosferatu",
    director: "F.W. Murnau",
    year: 1922,
    duration: 5580,
    url: "https://example.com/nosferatu.mp4",
  },
  {
    id: "metropolis",
    title: "Metropolis",
    director: "Fritz Lang",
    year: 1927,
    duration: 9180,
    url: "https://example.com/metropolis.mp4",
  },
  {
    id: "le-voyage-dans-la-lune",
    title: "Le Voyage dans la Lune",
    director: "Georges Méliès",
    year: 1902,
    duration: 840,
    url: "https://example.com/voyage-lune.mp4",
  },
  {
    id: "the-cabinet-of-dr-caligari",
    title: "The Cabinet of Dr. Caligari",
    director: "Robert Wiene",
    year: 1920,
    duration: 4560,
    url: "https://example.com/caligari.mp4",
  },
  {
    id: "battleship-potemkin",
    title: "Battleship Potemkin",
    director: "Sergei Eisenstein",
    year: 1925,
    duration: 4500,
    url: "https://example.com/potemkin.mp4",
  },
];

export const CYCLE_EPOCH = new Date("2026-01-01T00:00:00Z").getTime();

export function getTotalCycleDuration(): number {
  return FILMS.reduce((sum, film) => sum + film.duration, 0);
}
