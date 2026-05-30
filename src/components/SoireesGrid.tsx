"use client";

import Link from "next/link";
import { Film, SoireeRuntime } from "@/types";
import { useSchedule } from "@/lib/schedule-context";
import SoireeUpcomingCard, { SoireePoster } from "@/components/SoireeUpcomingCard";

function getSoireePoster(
  posterCustomUrl: string | undefined,
  posterFilmId: string | undefined,
  films: Film[],
): string | undefined {
  if (posterCustomUrl) return posterCustomUrl;
  if (posterFilmId) {
    const f = films.find((f) => f.id === posterFilmId);
    if (f?.poster) return f.poster;
  }
  return films[0]?.poster;
}

function LiveCard({ soiree, priority }: { soiree: SoireeRuntime; priority?: boolean }) {
  const currentFilm = soiree.films[soiree.currentIndex];
  const poster = getSoireePoster(soiree.posterCustomUrl, soiree.posterFilmId, soiree.films);

  return (
    <Link href="/movie" prefetch={false} className="relative flex flex-col gap-3 group">
      <SoireePoster poster={poster} priority={priority} />
      <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red">
        ★ Soirée en cours
      </div>
      <h3 className="font-bold text-[20px] leading-[1.1] tracking-[-0.01em] -mt-1 text-balance">
        {soiree.title}
      </h3>
      <div className="font-mono text-[11px] tracking-[0.04em] text-ink-2 -mt-1">
        ★ À l&apos;antenne · {currentFilm.title}
      </div>
    </Link>
  );
}

export default function SoireesGrid() {
  const { schedule } = useSchedule();

  const soiree = schedule?.soiree ?? null;
  const upcoming = (schedule?.upcomingSoirees ?? []).slice(0, soiree ? 3 : 4);
  const hasAny = soiree || upcoming.length > 0;

  return (
    <section
      id="soirees"
      className="px-10 py-15 border-b border-line max-md:px-5 max-md:py-10 scroll-mt-12"
    >
      <div className="flex justify-between items-baseline mb-8">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.16em] text-balance">
          {soiree ? "Soirée · en ce moment" : "Soirées · à venir"}
        </h2>
        <Link
          href="/soirees"
          className="text-[12px] text-ink-3 font-medium hover:text-ink transition-colors after:content-['_→']"
        >
          Tout voir
        </Link>
      </div>

      {hasAny ? (
        <div className="grid grid-cols-4 gap-5 max-[1100px]:grid-cols-2 max-[600px]:grid-cols-1">
          {soiree && <LiveCard soiree={soiree} priority />}
          {upcoming.map((s, i) => (
            <SoireeUpcomingCard
              key={s.id}
              poster={getSoireePoster(s.posterCustomUrl, s.posterFilmId, s.films)}
              startsAt={s.startsAt}
              title={s.title}
              films={s.films}
              custom={!!s.posterCustomUrl}
              creditedUsername={s.creditedUsername}
              priority={!soiree && i === 0}
            />
          ))}
        </div>
      ) : (
        <div className="border border-line rounded-lg px-10 py-16 flex flex-col items-center text-center gap-3 max-md:px-6 max-md:py-12">
          <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red">
            ★ Bientôt
          </div>
          <div className="font-bold text-[28px] leading-[1.1] tracking-[-0.02em] max-w-[520px]">
            Les soirées à thème arrivent
          </div>
          <p className="text-[14px] leading-[1.6] text-ink-2 max-w-[480px] text-balance">
            Nuits d&apos;auteurs, marathons, cycles par pays ou par décennie. Programmation en cours
            d&apos;écriture.
          </p>
        </div>
      )}
    </section>
  );
}
