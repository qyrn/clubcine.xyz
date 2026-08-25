"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useWatchHeartbeat } from "@/lib/use-watch-heartbeat";
import { ScheduleProvider, useSchedule } from "@/lib/schedule-context";
import Player from "@/components/Player";
import Chat from "@/components/Chat";
import ViewerCount from "@/components/ViewerCount";
import Brand from "@/components/Brand";
import { formatDuration } from "@/lib/schedule-engine";

function formatHM(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  if (m > 0) return `${m}m${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

function SoireePill() {
  const { schedule, nowMs } = useSchedule();
  const soiree = schedule?.soiree;
  if (!soiree) return null;

  const remaining = Math.max(0, Math.floor((soiree.endsAt - nowMs) / 1000));
  const filmIndex = soiree.currentIndex + 1;
  const filmCount = soiree.films.length;

  return (
    <div className="pointer-events-auto font-mono font-semibold tracking-[0.16em] uppercase whitespace-nowrap leading-[1]">
      <Link
        href="/soirees"
        title={`${soiree.title} · voir la programmation`}
        aria-label={`Soirée : ${soiree.title}, film ${filmIndex} sur ${filmCount}, ${formatHM(remaining)} restant`}
        style={{ color: "var(--color-red)" }}
        className="align-middle font-extrabold text-[14px] rounded-sm outline-1 outline-transparent hover:outline-red outline-offset-2 transition-[outline-color] duration-150"
      >
        ★ Soirée
      </Link>
      <span className="align-middle text-ink-4 mx-2 text-[12px]">·</span>
      <span className="align-middle text-ink text-[12px]">{soiree.title}</span>
      <span className="align-middle text-ink-4 mx-2 text-[11px]">·</span>
      <span className="align-middle text-ink-3 text-[11px]">
        Film {filmIndex}/{filmCount}
      </span>
      <span className="align-middle text-ink-4 mx-2 text-[10px]">·</span>
      <span className="align-middle text-ink-3 text-[10px] tabular-nums">
        {formatHM(remaining)} restant
      </span>
    </div>
  );
}

function FilmInfo({ visible }: { visible: boolean }) {
  const { schedule, nowMs } = useSchedule();

  if (!schedule || schedule.intermission) return null;

  const { currentFilm } = schedule;
  const baseTime = schedule.serverTime ?? nowMs;
  const driftSec = nowMs > 0 ? (nowMs - baseTime) / 1000 : 0;
  const elapsed = Math.max(0, Math.min(currentFilm.duration, schedule.currentOffset + driftSec));
  const progress = Math.min((elapsed / currentFilm.duration) * 100, 100);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[5] pointer-events-none transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="px-5 pb-14 pt-20"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)",
        }}
      >
        <div className="flex items-end justify-between gap-4 mb-2">
          <div className="flex items-end gap-4 min-w-0">
            {currentFilm.poster && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentFilm.poster}
                alt={currentFilm.title}
                className="w-[56px] h-[80px] object-cover shrink-0 border border-white/10 shadow-2xl rounded-md"
              />
            )}
            <div className="min-w-0 pb-0.5">
              <div className="font-bold text-[24px] text-ink leading-[1.05] tracking-[-0.02em] drop-shadow-lg">
                {currentFilm.title}
              </div>
              <div className="flex items-center gap-2 mt-1 font-mono text-[11px] tracking-[0.04em]">
                <span className="text-ink-2">
                  {currentFilm.director}, {currentFilm.year}
                </span>
                {currentFilm.movement && (
                  <>
                    <span className="text-ink-4">·</span>
                    <span className="text-[10px] text-ink-3 uppercase tracking-[0.16em]">
                      {currentFilm.movement}
                    </span>
                  </>
                )}
                {currentFilm.letterboxd && (
                  <>
                    <span className="text-ink-4">·</span>
                    <a
                      href={currentFilm.letterboxd}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-ink-3 hover:text-red transition-colors cursor-pointer pointer-events-auto uppercase tracking-[0.08em]"
                    >
                      letterboxd
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-ink-3 font-mono shrink-0 pb-1 tracking-[0.04em]">
            <span>{formatDuration(elapsed)}</span>
            <span className="text-ink-4">/</span>
            <span>{formatDuration(currentFilm.duration)}</span>
          </div>
        </div>
        <div className="w-full h-[2px] bg-line-2 overflow-hidden">
          <div
            className="h-full transition-all duration-1000 ease-linear bg-red"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

const OVERLAY_HIDE_DELAY_MS = 6000;

function MovieContent() {
  const { username } = useAuth();
  useWatchHeartbeat(username);
  const [chatOpen, setChatOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });
  const [overlayVisible, setOverlayVisible] = useState(true);
  const pageRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const overChatRef = useRef(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showOverlay = useCallback(() => {
    setOverlayVisible(true);
    clearHideTimer();
    if (overChatRef.current) return;
    hideTimerRef.current = window.setTimeout(() => {
      setOverlayVisible(false);
      hideTimerRef.current = null;
    }, OVERLAY_HIDE_DELAY_MS);
  }, [clearHideTimer]);

  const handleChatEnter = useCallback(() => {
    overChatRef.current = true;
    setOverlayVisible(true);
    clearHideTimer();
  }, [clearHideTimer]);

  const handleChatLeave = useCallback(() => {
    overChatRef.current = false;
    showOverlay();
  }, [showOverlay]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const onMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("aside")) return;
      showOverlay();
    };

    page.addEventListener("mousemove", onMove);
    page.addEventListener("touchstart", showOverlay, { passive: true });
    showOverlay();

    return () => {
      page.removeEventListener("mousemove", onMove);
      page.removeEventListener("touchstart", showOverlay);
      clearHideTimer();
    };
  }, [showOverlay, clearHideTimer]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        setChatOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div ref={pageRef} className="flex flex-col h-screen overflow-hidden bg-black">
      <header
        className="flex items-center gap-4 px-4 py-2.5 shrink-0 transition-all duration-500 z-20 absolute top-0 left-0 right-0"
        style={{
          opacity: overlayVisible ? 1 : 0,
          transform: overlayVisible ? "translateY(0)" : "translateY(-100%)",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)",
          pointerEvents: overlayVisible ? "auto" : "none",
        }}
      >
        <Brand href="/" sealSize={26} fontSize={17} />
        <SoireePill />
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative min-w-0">
          <Player controlsVisible={overlayVisible} />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.35) 100%)",
            }}
          />
          <FilmInfo visible={overlayVisible} />
        </div>

        <aside
          className={`shrink-0 border-l border-line flex flex-col bg-surface transition-all duration-400 overflow-hidden z-30 max-md:z-40 ${
            chatOpen
              ? "w-[340px] opacity-100 max-md:fixed max-md:inset-0 max-md:w-full max-md:border-l-0"
              : "w-0 opacity-0"
          }`}
          onMouseEnter={handleChatEnter}
          onMouseLeave={handleChatLeave}
        >
          <Chat onCollapse={() => setChatOpen(false)} extra={<ViewerCount />} />
        </aside>

        {!chatOpen && (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            aria-label="ouvrir le chat (T)"
            title="ouvrir le chat (T)"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 px-2 py-3 bg-surface/90 backdrop-blur-sm border border-r-0 border-line-2 rounded-l-md text-ink-3 hover:text-red hover:border-red transition-colors cursor-pointer group"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="font-mono text-[9px] tracking-[0.16em] uppercase [writing-mode:vertical-rl] [transform:rotate(180deg)] mt-1">
              chat
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function MoviePage() {
  return (
    <ScheduleProvider pollIntervalMs={30_000}>
      <MovieContent />
    </ScheduleProvider>
  );
}
