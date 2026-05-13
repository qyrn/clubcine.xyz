"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Film, ScheduleState, SoireeRuntime, UpcomingSoiree } from "@/types";

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function formatSoireeDate(ms: number): string {
  const d = new Date(ms);
  const day = WEEKDAYS[d.getDay()];
  const month = MONTHS[d.getMonth()];
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${d.getDate()} ${month} · ${h}h${m === "00" ? "" : m}`;
}

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

function NotifyButton({ soireeId }: { soireeId: string }) {
  const [alerted, setAlerted] = useState(false);

  useEffect(() => {
    try {
      setAlerted(window.localStorage.getItem(`clubcine-soiree-alerted-${soireeId}`) === "1");
    } catch {}
  }, [soireeId]);

  const toggle = () => {
    const next = !alerted;
    setAlerted(next);
    try {
      if (next) window.localStorage.setItem(`clubcine-soiree-alerted-${soireeId}`, "1");
      else window.localStorage.removeItem(`clubcine-soiree-alerted-${soireeId}`);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`absolute top-3 right-3 px-2.5 py-1 font-mono font-semibold text-[10px] tracking-[0.12em] uppercase rounded-sm transition-colors cursor-pointer ${
        alerted
          ? "bg-ink text-bg border border-ink"
          : "bg-bg/80 text-ink-3 border border-line-2 hover:border-ink hover:text-ink"
      }`}
      aria-pressed={alerted}
    >
      {alerted ? "Averti" : "M'avertir"}
    </button>
  );
}

function UpcomingCard({ soiree }: { soiree: UpcomingSoiree }) {
  const poster = getSoireePoster(soiree.posterCustomUrl, soiree.posterFilmId, soiree.films);

  return (
    <article className="relative flex flex-col gap-3 group">
      <NotifyButton soireeId={soiree.id} />
      <div className="relative aspect-[3/4] border border-line rounded-lg overflow-hidden bg-bg">
        {poster && (
          <Image
            src={poster}
            alt=""
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw"
            className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-5 gap-2">
          <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red">
            ★ À venir
          </div>
          <h3 className="font-bold text-[20px] leading-[1.1] tracking-[-0.01em]">
            {soiree.title}
          </h3>
          <div className="font-mono text-[11px] tracking-[0.04em] text-ink-2 capitalize">
            {formatSoireeDate(soiree.startsAt)}
          </div>
        </div>
      </div>
      <ul className="font-mono text-[11px] tracking-[0.04em] text-ink-3 flex flex-wrap gap-x-2 gap-y-1">
        {soiree.films.map((f) => (
          <li key={f.id}>★ {f.title}</li>
        ))}
      </ul>
      {soiree.creditedUsername && (
        <div className="font-mono text-[10px] tracking-[0.04em] text-ink-3">
          Suggérée par{" "}
          <Link
            href={`/u/${encodeURIComponent(soiree.creditedUsername)}`}
            className="text-ink-2 hover:text-ink transition-colors"
          >
            @{soiree.creditedUsername}
          </Link>
        </div>
      )}
    </article>
  );
}

function LiveCard({ soiree }: { soiree: SoireeRuntime }) {
  const currentFilm = soiree.films[soiree.currentIndex];
  const poster = getSoireePoster(soiree.posterCustomUrl, soiree.posterFilmId, soiree.films);

  return (
    <Link
      href="/movie"
      prefetch={false}
      className="relative flex flex-col gap-3 group col-span-2 max-[700px]:col-span-1"
    >
      <div className="relative aspect-[16/9] border border-line rounded-lg overflow-hidden bg-bg">
        {poster && (
          <Image
            src={poster}
            alt=""
            fill
            sizes="(max-width: 700px) 100vw, 50vw"
            className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 gap-2">
          <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red">
            ★ Soirée en cours
          </div>
          <h3 className="font-bold text-[28px] leading-[1.05] tracking-[-0.02em]">
            {soiree.title}
          </h3>
          <div className="font-mono text-[11px] tracking-[0.04em] text-ink-2">
            ★ À l&apos;antenne · {currentFilm.title}
          </div>
        </div>
      </div>
    </Link>
  );
}

interface Props {
  initialSchedule?: ScheduleState;
}

export default function SoireesGrid({ initialSchedule }: Props = {}) {
  const [schedule, setSchedule] = useState<ScheduleState | null>(initialSchedule ?? null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 1500;
    const fetchSchedule = async () => {
      try {
        const res = await fetch("/api/schedule");
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data: ScheduleState = await res.json();
        if (cancelled) return;
        setSchedule(data);
        retryDelay = 1500;
      } catch {
        if (cancelled) return;
        retryTimer = setTimeout(fetchSchedule, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      }
    };
    if (!initialSchedule) fetchSchedule();
    const interval = setInterval(fetchSchedule, 60_000);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(interval);
    };
  }, [initialSchedule]);

  const soiree = schedule?.soiree ?? null;
  const upcoming = (schedule?.upcomingSoirees ?? []).slice(0, soiree ? 3 : 4);
  const hasAny = soiree || upcoming.length > 0;

  return (
    <section
      id="soirees"
      className="px-10 py-15 border-b border-line max-md:px-5 max-md:py-10 scroll-mt-12"
    >
      <div className="flex justify-between items-baseline mb-8">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.16em]">
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
          {soiree && <LiveCard soiree={soiree} />}
          {upcoming.map((s) => (
            <UpcomingCard key={s.id} soiree={s} />
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
          <p className="text-[14px] leading-[1.6] text-ink-2 max-w-[480px]">
            Nuits d&apos;auteurs, marathons, cycles par pays ou par décennie. Programmation en cours
            d&apos;écriture.
          </p>
        </div>
      )}
    </section>
  );
}
