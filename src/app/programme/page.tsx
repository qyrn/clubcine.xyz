"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import { Film } from "@/types";
import { formatDuration } from "@/lib/schedule-engine";

interface ProgrammeItem {
  film: Film;
  startTime: number;
}

interface ProgrammeResponse {
  items: ProgrammeItem[];
  serverTime: number;
  hours: number;
}

function formatHour(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}h${d.getMinutes().toString().padStart(2, "0")}`;
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(ts: number, todayKey: string, tomorrowKey: string): string {
  const d = new Date(ts);
  const k = dayKey(ts);
  if (k === todayKey) return "Cette nuit";
  if (k === tomorrowKey) return "Demain";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function groupByDay(items: ProgrammeItem[], now: number) {
  const todayKey = dayKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dayKey(tomorrow.getTime());
  const map = new Map<string, { label: string; items: ProgrammeItem[] }>();
  for (const item of items) {
    const k = dayKey(item.startTime);
    if (!map.has(k)) {
      map.set(k, { label: dayLabel(item.startTime, todayKey, tomorrowKey), items: [] });
    }
    map.get(k)!.items.push(item);
  }
  return Array.from(map.values());
}

function ProgrammeContent() {
  const [data, setData] = useState<ProgrammeResponse | null>(null);
  const [grouped, setGrouped] = useState<{ label: string; items: ProgrammeItem[] }[]>([]);
  const [activeFilm, setActiveFilm] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchProgramme = async () => {
      try {
        const res = await fetch("/api/programme?hours=24");
        const json: ProgrammeResponse = await res.json();
        if (cancelled) return;
        setData(json);
        setGrouped(groupByDay(json.items, Date.now()));
        if (json.items.length > 0) setActiveFilm(json.items[0].film.id);
      } catch {}
    };
    fetchProgramme();
    const interval = setInterval(fetchProgramme, 120_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Ticker />
      <Nav active="programme" />

      <header className="px-10 py-24 border-b border-line flex flex-col items-center text-center gap-6 max-md:px-5 max-md:py-16">
        <div className="font-mono font-semibold text-[11px] leading-none tracking-[0.16em] uppercase text-ink-3">
          ★ <span className="text-red font-bold">Antenne 24/7</span>
          {" · Channel 01"}
        </div>
        <h1
          className="font-bold leading-[0.95] tracking-[-0.04em]"
          style={{ fontSize: "clamp(56px, 8vw, 128px)" }}
        >
          Programme
        </h1>
        <p className="text-[15px] leading-[1.6] text-ink-2 max-w-[520px]">
          Le flux des prochaines 24 heures. La grille est synchrone : tout le
          monde regarde la même chose au même moment.
        </p>
      </header>

      {!data ? (
        <div className="px-10 py-20 text-ink-3 font-mono text-[12px] tracking-[0.04em] uppercase">
          Chargement de la grille…
        </div>
      ) : (
        <div className="flex flex-col">
          {grouped.map((day, dIdx) => (
            <section key={dIdx} className="border-b border-line px-10 py-12 max-md:px-5 max-md:py-10">
              <div className="flex justify-between items-baseline mb-8">
                <h2 className="text-[14px] font-semibold uppercase tracking-[0.16em]">
                  {day.label}
                </h2>
                <span className="font-mono text-[11px] tracking-[0.04em] text-ink-3">
                  {day.items.length} film{day.items.length > 1 ? "s" : ""}
                </span>
              </div>

              <ul className="flex flex-col">
                {day.items.map((item, i) => {
                  const isActive = activeFilm === item.film.id && dIdx === 0 && i === 0;
                  return (
                    <li
                      key={`${item.film.id}-${item.startTime}`}
                      className="border-t border-line first:border-t-0 py-5 grid grid-cols-[100px_72px_1fr_auto] items-center gap-6 max-md:grid-cols-[80px_1fr] max-md:gap-3"
                    >
                      <div className="font-mono font-semibold text-[13px] tracking-[0.04em] text-ink-2 max-md:col-start-2 max-md:row-start-1">
                        {formatHour(item.startTime)}
                        {isActive && (
                          <span className="ml-2 inline-flex items-center gap-1.5 text-red text-[10px] tracking-[0.16em]">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red animate-[pulse-dot_1.5s_ease-in-out_infinite]" />
                            EN COURS
                          </span>
                        )}
                      </div>

                      <Link
                        href="/movie"
                        className="block w-[72px] aspect-[2/3] bg-cover bg-center border border-line rounded-md overflow-hidden hover:opacity-85 transition-opacity max-md:row-span-2 max-md:row-start-1 max-md:w-[80px]"
                        style={{
                          backgroundImage: item.film.poster
                            ? `url(${item.film.poster})`
                            : undefined,
                        }}
                        aria-label={`Affiche : ${item.film.title}`}
                      />

                      <div className="min-w-0 max-md:col-start-2">
                        <div className="font-semibold text-[18px] leading-[1.2] tracking-[-0.01em] truncate">
                          {item.film.title}
                        </div>
                        <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 mt-1 truncate">
                          {item.film.director}, {item.film.year}
                          {item.film.country && <> · {item.film.country}</>}
                          {item.film.movement && <> · {item.film.movement}</>}
                        </div>
                      </div>

                      <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 max-md:hidden">
                        {formatDuration(item.film.duration)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <footer className="px-10 py-6 flex justify-between items-center font-mono font-medium text-[11px] tracking-[0.04em] text-ink-4 max-md:px-5 max-md:py-4 max-md:flex-col max-md:gap-2">
        <span>CLUBCINE.XYZ · CHANNEL 01 · 2026</span>
        <Link href="/" className="hover:text-ink transition-colors">
          ← RETOUR
        </Link>
      </footer>
    </div>
  );
}

export default function ProgrammePage() {
  return <ProgrammeContent />;
}
