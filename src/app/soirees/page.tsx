import { getResolvedSoirees } from "@/data/soirees";
import { getCurrentSchedule } from "@/lib/schedule-engine";
import SoireesClient, { type SoireeView, type LiveSoireeView } from "./soirees-client";

export const dynamic = "force-dynamic";

function toView(
  def: ReturnType<typeof getResolvedSoirees>[number]["def"],
  films: ReturnType<typeof getResolvedSoirees>[number]["films"],
  startMs: number,
  endMs: number,
): SoireeView {
  return {
    id: def.id,
    title: def.title,
    subtitle: def.subtitle,
    films: films.map((f) => ({
      id: f.id,
      title: f.title,
      poster: f.poster,
      director: f.director,
      year: f.year,
    })),
    startsAt: startMs,
    endsAt: endMs,
    posterFilmId: def.posterFilmId,
    posterCustomUrl: def.posterCustomUrl,
    creditedSuggestionId: def.creditedSuggestionId,
    creditedUsername: def.creditedUsername,
  };
}

export default function SoireesPage() {
  const all = getResolvedSoirees();
  const now = Date.now();
  const schedule = getCurrentSchedule(now);

  const live: LiveSoireeView | null = schedule.soiree
    ? {
        id: schedule.soiree.id,
        title: schedule.soiree.title,
        subtitle: schedule.soiree.subtitle,
        films: schedule.soiree.films.map((f) => ({
          id: f.id,
          title: f.title,
          poster: f.poster,
          director: f.director,
          year: f.year,
        })),
        currentIndex: schedule.soiree.currentIndex,
        startsAt: schedule.soiree.startsAt,
        endsAt: schedule.soiree.endsAt,
        posterFilmId: schedule.soiree.posterFilmId,
        posterCustomUrl: schedule.soiree.posterCustomUrl,
        creditedSuggestionId: schedule.soiree.creditedSuggestionId,
        creditedUsername: schedule.soiree.creditedUsername,
      }
    : null;

  const past: SoireeView[] = [];
  const upcoming: SoireeView[] = [];
  for (const s of all) {
    const startMs = s.startSec * 1000;
    const endMs = s.endSec * 1000;
    if (endMs <= now) {
      if (live && s.def.id === live.id) continue;
      past.push(toView(s.def, s.films, startMs, endMs));
    } else if (startMs > now) {
      upcoming.push(toView(s.def, s.films, startMs, endMs));
    }
  }
  past.reverse();

  return <SoireesClient live={live} upcoming={upcoming} past={past} />;
}
