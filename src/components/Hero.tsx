"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Film, ScheduleState, SoireeRuntime } from "@/types";
import { formatDuration } from "@/lib/schedule-engine";

function formatHour(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}h${date.getMinutes().toString().padStart(2, "0")}`;
}

function formatHM(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

interface HeroState {
  schedule: ScheduleState;
  startMs: number;
  endMs: number;
}

function deriveState(schedule: ScheduleState): HeroState {
  const now = Date.now();
  const startMs = schedule.intermission
    ? now + schedule.intermission.secondsLeft * 1000
    : now - schedule.currentOffset * 1000;
  const endMs = startMs + schedule.currentFilm.duration * 1000;
  return { schedule, startMs, endMs };
}

function getSoireePoster(soiree: SoireeRuntime, currentFilm: Film): string | undefined {
  if (soiree.posterCustomUrl) return soiree.posterCustomUrl;
  if (soiree.posterFilmId) {
    const f = soiree.films.find((f) => f.id === soiree.posterFilmId);
    if (f?.poster) return f.poster;
  }
  return currentFilm.poster;
}

function SoireeHero({ schedule }: { schedule: ScheduleState }) {
  const soiree = schedule.soiree!;
  const currentFilm = schedule.currentFilm;
  const poster = getSoireePoster(soiree, currentFilm);
  const remainingSec = Math.max(0, Math.floor((soiree.endsAt - Date.now()) / 1000));

  return (
    <section className="grid grid-cols-[1fr_460px] gap-16 px-10 py-20 items-center border-b border-line max-[1000px]:grid-cols-1 max-[1000px]:px-8 max-[1000px]:py-12 max-[1000px]:gap-10">
      <div className="flex flex-col gap-6">
        <div className="font-mono font-semibold text-[11px] leading-none tracking-[0.16em] uppercase text-ink-3">
          ★ <strong className="text-red font-bold">Soirée en cours</strong>
          {" · "}
          {formatHM(remainingSec)} restant
        </div>

        <h1
          className="font-bold leading-[0.95] tracking-[-0.04em]"
          style={{ fontSize: "clamp(56px, 6.5vw, 104px)" }}
        >
          {soiree.title}
        </h1>

        <ul className="font-mono font-medium text-[12px] leading-[1.6] tracking-[0.06em] uppercase text-ink-2 flex flex-wrap gap-x-3 gap-y-1">
          {soiree.films.map((film, i) => {
            const isCurrent = i === soiree.currentIndex;
            return (
              <li key={film.id} className={isCurrent ? "text-ink font-semibold" : ""}>
                ★ {film.title}
                {isCurrent && <span className="text-red"> · à l&apos;antenne</span>}
              </li>
            );
          })}
        </ul>

        <p className="text-[15px] leading-[1.6] text-ink-2 max-w-[520px]">
          <span className="text-ink font-semibold">{currentFilm.title}</span>
          {" · "}
          {currentFilm.director}, {currentFilm.year}
          {currentFilm.synopsis && <> · {currentFilm.synopsis}</>}
        </p>

        <Link
          href="/movie"
          prefetch={false}
          className="inline-flex items-center gap-3 px-6 py-4 border border-ink bg-transparent text-ink font-semibold text-[13px] tracking-wide w-fit mt-2 transition-colors hover:border-red hover:text-red"
        >
          REJOINDRE LA SALLE
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="relative w-full max-[1000px]:max-w-[360px] max-[1000px]:mx-auto">
        {poster && (
          <div
            aria-hidden
            className="absolute inset-0 translate-y-3 -z-10 bg-cover bg-center blur-[40px] opacity-25 saturate-125"
            style={{ backgroundImage: `url(${poster})` }}
          />
        )}
        <Link
          href="/movie"
          prefetch={false}
          className="relative block w-full aspect-[2/3] border border-line bg-bg rounded-lg overflow-hidden"
          style={{
            boxShadow: "0 20px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
          aria-label={`Soirée : ${soiree.title}`}
        >
          {poster && (
            <Image
              src={poster}
              alt=""
              fill
              priority
              sizes="(max-width: 1000px) 360px, 460px"
              className="object-cover"
            />
          )}
        </Link>
      </div>
    </section>
  );
}

function CycleHero({ state }: { state: HeroState }) {
  const film = state.schedule.currentFilm;
  const startDate = new Date(state.startMs);
  const endDate = new Date(state.endMs);

  return (
    <section className="grid grid-cols-[1fr_460px] gap-16 px-10 py-20 items-center border-b border-line max-[1000px]:grid-cols-1 max-[1000px]:px-8 max-[1000px]:py-12 max-[1000px]:gap-10">
      <div className="flex flex-col gap-6">
        <div className="font-mono font-semibold text-[11px] leading-none tracking-[0.16em] uppercase text-ink-3">
          ★{" "}
          {state.schedule.intermission ? (
            <>
              <strong className="text-red font-bold">Entracte</strong>
              {" · Prochain film à "}
              {formatHour(startDate)}
            </>
          ) : (
            <>
              <strong className="text-red font-bold">À l&apos;antenne ce soir</strong>
              {" · "}
              {formatHour(startDate)} → {formatHour(endDate)}
            </>
          )}
        </div>

        <h1
          className="font-bold leading-[0.95] tracking-[-0.04em]"
          style={{ fontSize: "clamp(56px, 6.5vw, 104px)" }}
        >
          {film.title}
        </h1>

        <div className="font-mono font-medium text-[13px] leading-[1.5] tracking-[0.04em] text-ink-2">
          <strong className="text-ink font-semibold">{film.director}</strong>
          {film.country && <> · {film.country}</>}
          {" · "}
          {film.year}
          {" · "}
          {formatDuration(film.duration)}
          {film.movement && <> · {film.movement}</>}
        </div>

        {film.synopsis && (
          <p className="text-[15px] leading-[1.6] text-ink-2 max-w-[520px]">{film.synopsis}</p>
        )}

        <Link
          href="/movie"
          prefetch={false}
          className="inline-flex items-center gap-3 px-6 py-4 border border-ink bg-transparent text-ink font-semibold text-[13px] tracking-wide w-fit mt-2 transition-colors hover:border-red hover:text-red"
        >
          REJOINDRE LA SALLE
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="relative w-full max-[1000px]:max-w-[360px] max-[1000px]:mx-auto">
        {film.poster && (
          <div
            aria-hidden
            className="absolute inset-0 translate-y-3 -z-10 bg-cover bg-center blur-[40px] opacity-25 saturate-125"
            style={{ backgroundImage: `url(${film.poster})` }}
          />
        )}
        <Link
          href="/movie"
          prefetch={false}
          className="relative block w-full aspect-[2/3] border border-line bg-bg rounded-lg overflow-hidden"
          style={{
            boxShadow: "0 20px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
          aria-label={`Affiche : ${film.title}`}
        >
          {film.poster && (
            <Image
              src={film.poster}
              alt=""
              fill
              priority
              sizes="(max-width: 1000px) 360px, 460px"
              className="object-cover"
            />
          )}
        </Link>
      </div>
    </section>
  );
}

interface Props {
  initialSchedule?: ScheduleState;
}

export default function Hero({ initialSchedule }: Props = {}) {
  const [state, setState] = useState<HeroState | null>(
    initialSchedule ? deriveState(initialSchedule) : null,
  );

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
        setState(deriveState(data));
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

  if (!state) {
    return <section className="border-b border-line min-h-[60vh]" aria-hidden />;
  }

  if (state.schedule.soiree) {
    return <SoireeHero schedule={state.schedule} />;
  }

  return <CycleHero state={state} />;
}
