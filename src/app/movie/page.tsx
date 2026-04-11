"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AuthProvider } from "@/lib/auth-context";
import Player from "@/components/Player";
import Chat from "@/components/Chat";
import ViewerCount from "@/components/ViewerCount";
import { ScheduleState } from "@/types";
import { formatDuration } from "@/lib/schedule-engine";

function FilmInfo({ visible }: { visible: boolean }) {
  const [schedule, setSchedule] = useState<ScheduleState | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch("/api/schedule");
        const data: ScheduleState = await res.json();
        setSchedule(data);
        setElapsed(data.currentOffset);
      } catch {}
    };
    fetchSchedule();
    const interval = setInterval(fetchSchedule, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (schedule) setElapsed(schedule.currentOffset);
  }, [schedule]);

  if (!schedule) return null;

  const { currentFilm } = schedule;
  const progress = Math.min((elapsed / currentFilm.duration) * 100, 100);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[5] pointer-events-none transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="px-5 pb-14 pt-20" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)" }}>
        <div className="flex items-end justify-between gap-4 mb-2">
          <div className="flex items-end gap-4 min-w-0">
            {currentFilm.poster && (
              <img
                src={currentFilm.poster}
                alt={currentFilm.title}
                className="w-[56px] h-[80px] object-cover shrink-0 border border-white/10 shadow-2xl"
              />
            )}
            <div className="min-w-0 pb-0.5">
              <div className="font-[var(--font-title)] text-[24px] text-white italic leading-tight drop-shadow-lg">
                {currentFilm.title}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-white/60">
                  {currentFilm.director}, {currentFilm.year}
                </span>
                {currentFilm.genre && (
                  <>
                    <span className="text-white/20">/</span>
                    <span className="text-[10px] text-warm/80 italic">{currentFilm.genre}</span>
                  </>
                )}
                {currentFilm.letterboxd && (
                  <>
                    <span className="text-white/20">/</span>
                    <a
                      href={currentFilm.letterboxd}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-white/40 hover:text-warm/80 transition-colors cursor-pointer pointer-events-auto"
                    >
                      letterboxd
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/40 font-[var(--font-mono)] shrink-0 pb-1">
            <span>{formatDuration(elapsed)}</span>
            <span className="text-white/15">/</span>
            <span>{formatDuration(currentFilm.duration)}</span>
          </div>
        </div>
        <div className="w-full h-[2px] bg-white/10 overflow-hidden rounded-full">
          <div
            className="h-full transition-all duration-1000 ease-linear rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(to right, var(--color-warm), var(--color-red))",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MovieContent() {
  const [chatOpen, setChatOpen] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [filmInfoVisible, setFilmInfoVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setHeaderVisible(false);
      setFilmInfoVisible(false);
    }, 2000);
  }, []);

  const handleMouseMove = useCallback(() => {
    setHeaderVisible(true);
    setFilmInfoVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    scheduleHide();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [scheduleHide]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        setChatOpen((p) => !p);
      }
      if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        setHeaderVisible((p) => !p);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div ref={pageRef} className="flex flex-col h-screen overflow-hidden bg-black" style={{ cursor: headerVisible ? "auto" : "none" }} onMouseMove={handleMouseMove}>
      <header
        className="flex items-center justify-between px-4 py-2 shrink-0 transition-all duration-500 z-20 absolute top-0 left-0 right-0"
        style={{
          opacity: headerVisible ? 1 : 0,
          transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)",
          pointerEvents: headerVisible ? "auto" : "none",
        }}
      >
        <a
          href="/"
          className="font-[var(--font-title)] text-warm text-lg tracking-wide hover:opacity-80 transition-opacity"
        >
          tv<span className="inline-block animate-[pulse-dot_4s_ease-in-out_infinite]">.</span>qyrn
        </a>

      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative min-w-0">
          <Player />
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.35) 100%)",
          }} />
          <FilmInfo visible={filmInfoVisible} />
        </div>

        <div
          className="shrink-0 border-l border-white/5 flex flex-col bg-[#0a0a0a] transition-all duration-400 overflow-hidden z-30"
          style={{ width: chatOpen ? 340 : 0, opacity: chatOpen ? 1 : 0 }}
        >
          <Chat onCollapse={() => setChatOpen(false)} extra={<ViewerCount />} />
        </div>

      </div>

    </div>
  );
}

export default function MoviePage() {
  return (
    <AuthProvider>
      <MovieContent />
    </AuthProvider>
  );
}
