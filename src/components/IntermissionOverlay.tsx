"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  title: string;
  director?: string;
  year?: number;
  posterUrl?: string | null;
  musicUrl?: string | null;
  secondsLeft: number | null;
}

const DEFAULT_VOLUME = 0.35;
const FADE_OUT_AT = 10;
const VOLUME_KEY = "clubcine-intermission-volume";

interface Track {
  url: string;
  title?: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadVolume(): number {
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  const raw = window.localStorage.getItem(VOLUME_KEY);
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
  musicUrl,
  secondsLeft,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef<Track[]>([]);
  const trackIndexRef = useRef(0);
  const playNextRef = useRef<(() => void) | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState<number>(() => loadVolume());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  useEffect(() => {
    if (!musicUrl) return;
    let cancelled = false;

    const audio = new Audio();
    audio.loop = false;
    audio.volume = 0;
    audio.preload = "auto";
    audioRef.current = audio;

    const playNext = () => {
      if (cancelled || tracksRef.current.length === 0) return;
      const i = trackIndexRef.current % tracksRef.current.length;
      const t = tracksRef.current[i];
      trackIndexRef.current = (i + 1) % tracksRef.current.length;
      audio.src = t.url;
      setCurrentTrackTitle(t.title ?? null);
      audio.play()
        .then(() => setAudioBlocked(false))
        .catch(() => setAudioBlocked(true));
    };
    playNextRef.current = playNext;

    audio.addEventListener("ended", playNext);

    const load = async () => {
      let tracks: Track[] = [];
      try {
        if (musicUrl.endsWith(".json")) {
          const res = await fetch(musicUrl);
          if (res.ok) {
            const data = await res.json() as { tracks?: Track[] };
            tracks = data.tracks ?? [];
          }
        } else {
          tracks = [{ url: musicUrl }];
        }
      } catch {
        tracks = [];
      }
      if (cancelled) return;
      if (tracks.length === 0) return;
      tracksRef.current = shuffle(tracks);
      trackIndexRef.current = 0;
      playNext();
    };
    load();

    return () => {
      cancelled = true;
      audio.removeEventListener("ended", playNext);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
      tracksRef.current = [];
      trackIndexRef.current = 0;
      playNextRef.current = null;
      setCurrentTrackTitle(null);
    };
  }, [musicUrl]);

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
      <div className="relative font-mono font-semibold text-[12px] tracking-[0.32em] uppercase text-red animate-[pulse-dot_2s_ease-in-out_infinite]">
        ★ Entracte
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
      {audioBlocked && musicUrl && (
        <button
          type="button"
          onClick={tryUnlockAudio}
          className="relative mt-2 px-3 py-1.5 border border-line-2 hover:border-red hover:text-red font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 rounded-md transition-colors cursor-pointer"
        >
          ♪ Activer le son
        </button>
      )}

      {musicUrl && !audioBlocked && (
        <div className="absolute bottom-6 right-6 flex items-center gap-3 border border-line-2 bg-black/60 backdrop-blur px-3 py-2 rounded-md max-w-[340px]">
          <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-3 truncate min-w-0 max-w-[120px]">
            {currentTrackTitle ? `♪ ${currentTrackTitle}` : "♪"}
          </div>
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
          <button
            type="button"
            onClick={() => playNextRef.current?.()}
            aria-label="Piste suivante"
            className="text-ink-2 hover:text-ink transition-colors cursor-pointer flex-shrink-0"
          >
            <ForwardIcon />
          </button>
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

function ForwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  );
}
