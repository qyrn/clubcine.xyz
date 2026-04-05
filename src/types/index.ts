export interface Film {
  id: string;
  title: string;
  director: string;
  year: number;
  duration: number;
  url: string;
  poster?: string;
}

export interface ScheduleState {
  currentFilm: Film;
  currentOffset: number;
  nextFilms: Film[];
  cycleStart: number;
  totalCycleDuration: number;
}

export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: number;
}
