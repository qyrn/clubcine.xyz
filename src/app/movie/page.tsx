"use client";

import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { useWatchHeartbeat } from "@/lib/use-watch-heartbeat";
import Player from "@/components/Player";
import Chat from "@/components/Chat";
import ViewerCount from "@/components/ViewerCount";
import Brand from "@/components/Brand";
import { ScheduleState } from "@/types";
import { formatDuration } from "@/lib/schedule-engine";

function FilmInfo({ visible }: { visible: boolean }) {
  const [schedule, setSchedule] = useState<ScheduleState | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchSchedule = async () => {
      try {
        const res = await fetch("/api/schedule");
        const data: ScheduleState = await res.json();
        if (cancelled) return;
        setSchedule(data);
        setElapsed(data.currentOffset);
      } catch {}
    };
    fetchSchedule();
    const interval = setInterval(fetchSchedule, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
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

function MovieContent() {
  const { username } = useAuth();
  useWatchHeartbeat(username);
  const [chatOpen, setChatOpen] = useState(true);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

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
        className="flex items-center justify-between px-4 py-2.5 shrink-0 transition-all duration-500 z-20 absolute top-0 left-0 right-0"
        style={{
          opacity: overlayVisible ? 1 : 0,
          transform: overlayVisible ? "translateY(0)" : "translateY(-100%)",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)",
          pointerEvents: overlayVisible ? "auto" : "none",
        }}
      >
        <Brand href="/" sealSize={26} fontSize={17} />
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative min-w-0">
          <Player onControlsVisibleChange={setOverlayVisible} />
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
          className="shrink-0 border-l border-line flex flex-col bg-[#0a0a0a] transition-all duration-400 overflow-hidden z-30"
          style={{ width: chatOpen ? 340 : 0, opacity: chatOpen ? 1 : 0 }}
        >
          <Chat onCollapse={() => setChatOpen(false)} extra={<ViewerCount />} />
        </aside>
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
