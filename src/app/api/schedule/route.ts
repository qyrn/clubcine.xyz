import { NextResponse } from "next/server";
import { existsSync } from "fs";
import path from "path";
import { getCurrentSchedule } from "@/lib/schedule-engine";
import { Film } from "@/types";

export const dynamic = "force-dynamic";

const PUBLIC_SUBS_DIR = path.join(process.cwd(), "public", "subs");

function proxySubtitles(film: Film): Film {
  if (!film.subtitles || film.subtitles.length === 0) return film;
  return {
    ...film,
    subtitles: film.subtitles.map((sub) => {
      const localFile = path.join(PUBLIC_SUBS_DIR, `${film.id}.${sub.lang}.vtt`);
      if (existsSync(localFile)) {
        return { ...sub, url: `/subs/${film.id}.${sub.lang}.vtt` };
      }
      return { ...sub, url: `/api/sub?film=${encodeURIComponent(film.id)}&lang=${encodeURIComponent(sub.lang)}` };
    }),
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
