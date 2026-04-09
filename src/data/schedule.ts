import { Film } from "@/types";

export const FILMS: Film[] = [
  {
    id: "nosferatu",
    title: "Nosferatu",
    director: "F.W. Murnau",
    year: 1922,
    duration: 5580,
    url: "https://archive.org/download/nosferatu.-1922.-blu-ray.-1080p/Nosferatu.1922.BluRay.1080p.DTS-HD.MA.5.1.AVC.REMUX-FraMeSToR.mp4",
    letterboxd: "https://letterboxd.com/film/nosferatu-1922/",
    synopsis: "Un agent immobilier rend visite au comte Orlok, vampire des Carpates, et ramène la peste avec lui.",
    country: "Allemagne",
    genre: "Horreur",
    movement: "Expressionnisme allemand",
  },
  {
    id: "metropolis",
    title: "Metropolis",
    director: "Fritz Lang",
    year: 1927,
    duration: 9180,
    url: "https://archive.org/download/metropolis-1927-film-completo-con-sottotitoli-in-italiano/Metropolis%20%281927%29%20--%20Film%20completo%20con%20sottotitoli%20in%20italiano.mp4",
    letterboxd: "https://letterboxd.com/film/metropolis/",
    synopsis: "Dans une mégalopole futuriste, les ouvriers souterrains se soulèvent contre les maîtres de la surface.",
    country: "Allemagne",
    genre: "Science-fiction",
    movement: "Expressionnisme allemand",
  },
  {
    id: "le-voyage-dans-la-lune",
    title: "Le Voyage dans la Lune",
    director: "Georges Méliès",
    year: 1902,
    duration: 840,
    url: "https://archive.org/download/Levoyagedanslalune/Le_voyage_dans_la_lune_A_trip_to_the_moon__Georges_Mlis_1902_512kb.mp4",
    letterboxd: "https://letterboxd.com/film/a-trip-to-the-moon/",
    synopsis: "Des astronomes embarquent dans un obus tiré vers la Lune et y découvrent ses habitants.",
    country: "France",
    genre: "Fantaisie",
    movement: "Cinéma des premiers temps",
  },
  {
    id: "the-cabinet-of-dr-caligari",
    title: "The Cabinet of Dr. Caligari",
    director: "Robert Wiene",
    year: 1920,
    duration: 4560,
    url: "https://archive.org/download/the-cabinet-of-dr-caligari-1920_202501/The%20Cabinet%20of%20Dr%20Caligari%201920.mp4",
    letterboxd: "https://letterboxd.com/film/the-cabinet-of-dr-caligari/",
    synopsis: "Un hypnotiseur de foire utilise un somnambule pour commettre des meurtres dans une ville déformée.",
    country: "Allemagne",
    genre: "Horreur",
    movement: "Expressionnisme allemand",
  },
  {
    id: "battleship-potemkin",
    title: "Battleship Potemkin",
    director: "Sergei Eisenstein",
    year: 1925,
    duration: 4500,
    url: "https://archive.org/download/BattleshipPotemkin1925/Battleship%20Potemkin%20%281925%29.mp4",
    letterboxd: "https://letterboxd.com/film/battleship-potemkin/",
    synopsis: "L'équipage du cuirassé Potemkine se mutine, déclenchant un soulèvement à Odessa.",
    country: "URSS",
    genre: "Drame historique",
    movement: "Montage soviétique",
  },
];

export const CYCLE_EPOCH = new Date("2026-01-01T00:00:00Z").getTime();

export function getTotalCycleDuration(): number {
  return FILMS.reduce((sum, film) => sum + film.duration, 0);
}
