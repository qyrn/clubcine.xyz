"use client";

import { useEffect, useRef, useState } from "react";
import IntermissionOverlay from "@/components/IntermissionOverlay";
import { FILMS } from "@/data/schedule";

const PRESETS = [10, 30, 60, 5 * 60, 15 * 60, 30 * 60];

export default function IntermissionTest() {
  const [filmIndex, setFilmIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(60);
  const [running, setRunning] = useState(false);
  const [musicOverride, setMusicOverride] = useState("");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 0) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running]);

  const film = FILMS[filmIndex];
  if (!film) return null;

  const apply = (n: number) => {
    setSecondsLeft(n);
    setRunning(false);
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <IntermissionOverlay
        key={`${film.id}-${musicOverride}`}
        title={film.title}
        director={film.director}
        year={film.year}
        posterUrl={film.poster}
        musicUrl={musicOverride.trim() || film.music || null}
        secondsLeft={secondsLeft}
      />

      <div className="absolute top-4 left-4 z-30 flex flex-col gap-3 bg-bg/90 backdrop-blur-sm border border-line-2 rounded-md p-4 max-w-[320px]">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-red font-bold">
          [ Test entracte ]
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
            Film
          </span>
          <select
            value={filmIndex}
            onChange={(e) => setFilmIndex(Number(e.target.value))}
            className="bg-bg border border-line-2 px-2 py-1.5 text-[12px] text-ink rounded-md cursor-pointer outline-none focus:border-ink"
          >
            {FILMS.map((f, i) => (
              <option key={f.id} value={i}>
                {f.title} ({f.year})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
            Compte à rebours
          </span>
          <input
            type="number"
            min={0}
            value={secondsLeft ?? 0}
            onChange={(e) => apply(Math.max(0, Number(e.target.value)))}
            className="bg-bg border border-line-2 px-2 py-1.5 text-[12px] text-ink rounded-md outline-none focus:border-ink font-mono"
          />
          <div className="flex flex-wrap gap-1 mt-1">
            {PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => apply(s)}
                className="px-2 py-1 border border-line-2 text-[10px] font-mono uppercase tracking-[0.04em] text-ink-2 hover:border-ink hover:text-ink rounded transition-colors cursor-pointer"
              >
                {s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="flex-1 px-3 py-2 border border-ink text-ink font-semibold text-[11px] uppercase tracking-[0.08em] hover:border-red hover:text-red rounded transition-colors cursor-pointer"
          >
            {running ? "Pause" : "Lancer"}
          </button>
          <button
            type="button"
            onClick={() => apply(60)}
            className="flex-1 px-3 py-2 border border-line-2 text-ink-2 font-semibold text-[11px] uppercase tracking-[0.08em] hover:border-ink hover:text-ink rounded transition-colors cursor-pointer"
          >
            Reset 1m
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
            Musique (URL custom)
          </span>
          <input
            type="url"
            value={musicOverride}
            onChange={(e) => setMusicOverride(e.target.value)}
            placeholder={film.music ?? "https://…/track.mp3"}
            className="bg-bg border border-line-2 px-2 py-1.5 text-[11px] text-ink rounded-md outline-none focus:border-ink font-mono placeholder:text-ink-4"
          />
          <span className="font-mono text-[9px] tracking-[0.04em] text-ink-4">
            {film.music
              ? `Défaut : ${film.music}`
              : "Ce film n'a pas de musique définie (hasMusic absent)."}
          </span>
        </div>

        <p className="text-[10px] text-ink-4 leading-[1.5] text-balance">
          Cette page sert à prévisualiser l&apos;écran d&apos;entracte
          (countdown + musique) sans attendre une vraie transition.
        </p>
      </div>
    </div>
  );
}
