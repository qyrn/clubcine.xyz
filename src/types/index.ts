export interface Film {
  id: string;
  title: string;
  director: string;
  year: number;
  duration: number;
  url: string;
  music?: string;
  poster?: string;
  letterboxd?: string;
  synopsis?: string;
  country?: string;
  genre?: string;
  movement?: string;
}

export interface IntermissionState {
  secondsLeft: number;
  prevFilm: Film | null;
}

export interface ScheduledFilmEntry {
  film: Film;
  startTime: number;
}

export interface ScheduleState {
  currentFilm: Film;
  currentOffset: number;
  intermission: IntermissionState | null;
  nextFilms: ScheduledFilmEntry[];
  cycleStart: number;
  totalCycleDuration: number;
  serverTime?: number;
}

export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: number;
}
