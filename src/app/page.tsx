import { getCurrentSchedule } from "@/lib/schedule-engine";
import HomeClient from "./home-client";

export const dynamic = "force-dynamic";

export default function Home() {
  const schedule = getCurrentSchedule();
  const poster = schedule.currentFilm.poster;
  return (
    <>
      {poster && (
        <link rel="preload" as="image" href={poster} fetchPriority="high" />
      )}
      <HomeClient initialSchedule={schedule} />
    </>
  );
}
