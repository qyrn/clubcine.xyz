import { Film } from "@/types";

export const FILMS: Film[] = [
  {
    id: "boogie-nights",
    title: "Boogie Nights",
    director: "Paul Thomas Anderson",
    year: 1997,
    duration: 9328,
    url: "https://archive.org/download/boogie-nights-1997/boogie-nights-1997-final.mp4",
    poster: "/posters/boogienight.jpg",
    subtitles: [
      { label: "Français", lang: "fr", url: "https://archive.org/download/boogie-nights-1997/boogie-nights-1997.fr.vtt" },
    ],
    letterboxd: "https://letterboxd.com/film/boogie-nights/",
    synopsis: "Un jeune homme découvre l'industrie du film pour adultes dans le Los Angeles des années 70.",
    country: "USA",
    genre: "Drame",
    movement: "Nouveau Hollywood",
  },
  {
    id: "blue-velvet",
    title: "Blue Velvet",
    director: "David Lynch",
    year: 1986,
    duration: 7230,
    url: "https://archive.org/download/qyrn-proj-02/blue-velvet-1986-final.mp4",
    poster: "/posters/bluevelvet.jpg",
    subtitles: [
      { label: "Français", lang: "fr", url: "https://archive.org/download/qyrn-proj-02/blue-velvet-1986.fr.vtt" },
    ],
    letterboxd: "https://letterboxd.com/film/blue-velvet/",
    synopsis: "Un jeune homme découvre un monde souterrain de violence et de désir derrière la façade paisible d'une petite ville américaine.",
    country: "USA",
    genre: "Thriller",
    movement: "Surréalisme",
  },
  {
    id: "sonatine",
    title: "Sonatine",
    director: "Takeshi Kitano",
    year: 1993,
    duration: 5629,
    url: "https://archive.org/download/qyrn-proj-03/sonatine-1993-final.mp4",
    poster: "/posters/sonatine.png",
    subtitles: [
      { label: "Français", lang: "fr", url: "https://archive.org/download/qyrn-proj-03/sonatine-1993.fr.vtt" },
    ],
    letterboxd: "https://letterboxd.com/film/sonatine-1993/",
    synopsis: "Un yakuza fatigué est envoyé à Okinawa pour régler un conflit territorial, mais le piège se referme lentement.",
    country: "Japon",
    genre: "Thriller",
    movement: "Cinéma japonais",
  },
];

export const CYCLE_EPOCH = new Date("2026-01-01T00:00:00Z").getTime();

export function getTotalCycleDuration(): number {
  return FILMS.reduce((sum, film) => sum + film.duration, 0);
}
