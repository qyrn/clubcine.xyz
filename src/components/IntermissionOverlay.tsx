"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useEmotes } from "@/lib/use-emotes";
import { useReactions } from "@/lib/use-reactions";
import { safeImageUrl } from "@/lib/safe-url";
import { readStorage, writeStorage } from "@/lib/safe-storage";

export interface IntermissionSoiree {
  title: string;
  films: { id: string; title: string }[];
  nextFilmId: string;
}

interface Props {
  title: string;
  director?: string;
  year?: number;
  posterUrl?: string | null;
  secondsLeft: number | null;
  soiree?: IntermissionSoiree | null;
}

const AMBIANCE_URL = "/audio/entracte.mp3";
const DEFAULT_VOLUME = 0.35;
const FADE_OUT_AT = 10;
const VOLUME_KEY = "clubcine-intermission-volume";

function loadVolume(): number {
  const raw = readStorage(VOLUME_KEY);
  if (!raw) return DEFAULT_VOLUME;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return DEFAULT_VOLUME;
  return n;
}

export default function IntermissionOverlay({
  title,
  director,
  year,
  posterUrl,
  secondsLeft,
  soiree,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState<number>(() => loadVolume());
  const emotes = useEmotes();
  const { reactions, send: sendReaction } = useReactions();

  const soireeNextIndex = soiree
    ? soiree.films.findIndex((f) => f.id === soiree.nextFilmId)
    : -1;

  useEffect(() => {
    writeStorage(VOLUME_KEY, String(volume));
  }, [volume]);

  useEffect(() => {
    const audio = new Audio(AMBIANCE_URL);
    audio.loop = true;
    audio.volume = 0;
    audio.preload = "auto";
    audioRef.current = audio;

    audio.play()
      .then(() => setAudioBlocked(false))
      .catch(() => setAudioBlocked(true));

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (muted) {
      audio.volume = 0;
      return;
    }
    if (secondsLeft === null) {
      audio.volume = volume;
      return;
    }
    if (secondsLeft > FADE_OUT_AT) {
      audio.volume = volume;
    } else if (secondsLeft > 0) {
      audio.volume = Math.max(0, (secondsLeft / FADE_OUT_AT) * volume);
    } else {
      audio.volume = 0;
    }
  }, [secondsLeft, muted, volume]);

  useEffect(() => {
    if (!audioBlocked) return;
    const audio = audioRef.current;
    if (!audio) return;
    const handler = () => {
      audio.play().then(() => setAudioBlocked(false)).catch(() => {});
    };
    const opts: AddEventListenerOptions = { once: true, capture: true };
    window.addEventListener("pointerdown", handler, opts);
    window.addEventListener("keydown", handler, opts);
    window.addEventListener("touchstart", handler, opts);
    return () => {
      window.removeEventListener("pointerdown", handler, opts);
      window.removeEventListener("keydown", handler, opts);
      window.removeEventListener("touchstart", handler, opts);
    };
  }, [audioBlocked]);

  const tryUnlockAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => setAudioBlocked(false)).catch(() => {});
  };

  return (
    <div className="absolute inset-0 z-[19] bg-black flex flex-col items-center justify-center text-center gap-6 px-6">
      {posterUrl && (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-15 blur-[40px] saturate-125"
          style={{ backgroundImage: `url(${posterUrl})` }}
        />
      )}
      <div
        className={`relative font-mono font-semibold text-[12px] uppercase text-red pulse-dot ${
          soiree ? "tracking-[0.22em] max-w-[90vw] text-balance" : "tracking-[0.32em]"
        }`}
      >
        {soiree ? `★ Soirée · ${soiree.title}` : "★ Entracte"}
      </div>
      <div className="relative font-mono text-[11px] tracking-[0.16em] uppercase text-ink-3">
        Prochain film
      </div>
      <div
        className="relative font-bold leading-[0.95] tracking-[-0.03em] text-ink max-w-[720px]"
        style={{ fontSize: "clamp(36px, 5vw, 72px)" }}
      >
        {title}
      </div>
      {(director || year) && (
        <div className="relative font-mono text-[12px] tracking-[0.04em] text-ink-2">
          {director}
          {director && year ? ", " : ""}
          {year}
        </div>
      )}
      {secondsLeft !== null && secondsLeft > 0 && (
        <div className="relative font-mono text-[14px] tracking-[0.12em] uppercase text-ink mt-4">
          Démarre dans{" "}
          <span className="text-red font-bold">
            {Math.floor(secondsLeft / 60)}
            {" min "}
            {(Math.floor(secondsLeft) % 60).toString().padStart(2, "0")}
            {" s"}
          </span>
        </div>
      )}
      {soiree && (
        <ol
          aria-label="Films de la soirée"
          className="relative mt-1 flex flex-wrap items-start justify-center gap-x-7 gap-y-3 max-w-[640px]"
        >
          {soiree.films.map((f, i) => {
            const state =
              soireeNextIndex >= 0 && i < soireeNextIndex
                ? "done"
                : i === soireeNextIndex
                  ? "next"
                  : "upcoming";
            const label =
              state === "done" ? "terminé" : state === "next" ? "à suivre" : "à venir";
            return (
              <li
                key={f.id}
                aria-current={state === "next" ? "step" : undefined}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={`font-mono text-[11px] tracking-[0.12em] uppercase ${
                    state === "done"
                      ? "text-ink-3 line-through"
                      : state === "next"
                        ? "text-red font-semibold"
                        : "text-ink-2"
                  }`}
                >
                  {state === "next" ? "★ " : ""}
                  {f.title}
                </span>
                <span
                  className={`font-mono text-[9px] tracking-[0.18em] uppercase ${
                    state === "next" ? "text-red" : "text-ink-3"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {audioBlocked && (
        <button
          type="button"
          onClick={tryUnlockAudio}
          className="relative mt-2 px-3 py-1.5 border border-line-2 hover:border-red hover:text-red font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 rounded-md transition-colors cursor-pointer"
        >
          ♪ Activer le son
        </button>
      )}

      {!audioBlocked && (
        <div className="absolute bottom-6 right-6 flex items-center gap-3 border border-line-2 bg-black/60 backdrop-blur px-3 py-2 rounded-md">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Activer le son" : "Couper le son"}
            className="text-ink-2 hover:text-ink transition-colors cursor-pointer flex-shrink-0"
          >
            {muted ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (v > 0 && muted) setMuted(false);
              if (v === 0) setMuted(true);
            }}
            aria-label="Volume"
            className="w-20 accent-red cursor-pointer flex-shrink-0"
          />
        </div>
      )}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {reactions.map((r) => {
          const emote = emotes.get(r.slug);
          const src = emote ? safeImageUrl(emote.imageUrl) : null;
          if (!src) return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={r.id}
              src={src}
              alt=""
              aria-hidden
              draggable={false}
              className="reaction-float absolute bottom-[72px] w-9 h-auto select-none will-change-transform"
              style={
                {
                  left: `${r.left}%`,
                  "--drift": `${r.drift}px`,
                  animation: `reaction-float ${r.duration}ms ease-out forwards`,
                } as CSSProperties
              }
            />
          );
        })}
      </div>

      {emotes.size > 0 && (
        <div className="absolute bottom-6 left-6 flex items-center gap-1 border border-line-2 bg-black/60 backdrop-blur px-2 py-1.5 rounded-md max-w-[min(70vw,360px)] overflow-x-auto">
          {Array.from(emotes.values()).map((e) => {
            const src = safeImageUrl(e.imageUrl);
            if (!src) return null;
            return (
              <button
                key={e.slug}
                type="button"
                onClick={() => sendReaction(e.slug)}
                title={`:${e.slug}:`}
                aria-label={`Réagir avec ${e.label || e.slug}`}
                className="shrink-0 w-8 h-8 flex items-center justify-center border border-transparent hover:border-red hover:bg-line rounded-sm cursor-pointer transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="max-h-[78%] max-w-[78%] select-none"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SpeakerOnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
