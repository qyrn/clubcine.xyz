"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Soiree {
  id: string;
  date: string;
  title: string;
  films: string;
  poster: string;
}

const SOIREES: Soiree[] = [
  {
    id: "kubrick",
    date: "VEN 17/05 · 21H00",
    title: "Nuit Kubrick",
    films: "Barry Lyndon · Shining · Clockwork · EWS",
    poster: "/posters/barry-lyndon.webp",
  },
  {
    id: "polars-jp",
    date: "SAM 18/05 · 22H00",
    title: "Polars japonais",
    films: "Sonatine · Kikujiro · High and Low · Yojimbo",
    poster: "/posters/sonatine.webp",
  },
  {
    id: "comedie-fr",
    date: "DIM 19/05 · 20H30",
    title: "Comédie française",
    films: "Un air de famille · Frantz · Paris · C'est la vie",
    poster: "/posters/family-resemblances.webp",
  },
  {
    id: "pta",
    date: "VEN 24/05 · 21H00",
    title: "PTA marathon",
    films: "Boogie · Magnolia · Phantom · There Will Be Blood",
    poster: "/posters/magnolia.webp",
  },
];

const STORAGE_KEY = "clubcine-soirees-rappels";

export default function SoireesGrid() {
  const [rappels, setRappels] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRappels(new Set(parsed));
      }
    } catch {}
  }, []);

  const toggle = (id: string) => {
    setRappels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  return (
    <section id="soirees" className="px-10 py-15 border-b border-line max-md:px-5 max-md:py-10 scroll-mt-12">
      <div className="flex justify-between items-baseline mb-8">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.16em]">
          Soirées · à venir
        </h2>
        <Link
          href="#liste"
          className="text-[12px] text-ink-3 font-medium hover:text-ink transition-colors after:content-['_→']"
        >
          Toutes les soirées
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-5 max-[1000px]:grid-cols-2 max-[600px]:grid-cols-1">
        {SOIREES.map((s) => {
          const active = rappels.has(s.id);
          return (
            <article
              key={s.id}
              className="relative aspect-[3/4] bg-cover bg-center overflow-hidden cursor-pointer"
              style={{ backgroundImage: `url(${s.poster})` }}
            >
              <div
                className="absolute inset-0 z-[1]"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7) 100%)",
                }}
              />

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggle(s.id);
                }}
                className={`absolute top-4 right-4 z-[3] px-2.5 py-1.5 text-[11px] font-medium border transition-colors ${
                  active
                    ? "bg-ink text-bg border-ink"
                    : "bg-black/70 text-ink border-white/20 hover:bg-ink hover:text-bg hover:border-ink"
                }`}
              >
                {active ? "averti" : "m'avertir"}
              </button>

              <div className="absolute left-5 right-5 bottom-5 z-[2]">
                <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red mb-2">
                  {s.date}
                </div>
                <div className="font-bold text-[24px] leading-none tracking-[-0.02em] mb-1.5">
                  {s.title}
                </div>
                <div className="font-mono text-[11px] leading-[1.4] text-ink-2">
                  {s.films}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
