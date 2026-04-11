import { NextResponse } from "next/server";
import { getCurrentSchedule } from "@/lib/schedule-engine";
import { Film } from "@/types";

export const dynamic = "force-dynamic";

function proxySubtitles(film: Film): Film {
  if (!film.subtitles || film.subtitles.length === 0) return film;
  return {
    ...film,
    subtitles: film.subtitles.map((sub) => ({
      ...sub,
      url: `/api/sub?film=${encodeURIComponent(film.id)}&lang=${encodeURIComponent(sub.lang)}`,
    })),
  };
}

export function GET() {
  const schedule = getCurrentSchedule();
  return NextResponse.json({
    ...schedule,
    serverTime: Date.now(),
    currentFilm: proxySubtitles(schedule.currentFilm),
    nextFilms: schedule.nextFilms.map(proxySubtitles),
  });
}
