"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ScheduleState } from "@/types";

const SYNC_INTERVAL = 30_000;
const SYNC_THRESHOLD = 3;

export default function Player() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [schedule, setSchedule] = useState<ScheduleState | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [showControls, setShowControls] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncServerTime = useCallback(async () => {
    try {
      const before = Date.now();
      const res = await fetch("/api/now");
      const { now } = await res.json();
      const rtt = Date.now() - before;
      setServerOffset(now + rtt / 2 - Date.now());
    } catch {
      /* noop */
    }
  }, []);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule");
      const data: ScheduleState = await res.json();
      setSchedule(data);
      setError(null);
      return data;
    } catch {
      setError("signal perdu");
      return null;
    }
  }, []);

  const syncPlayback = useCallback(
    (data: ScheduleState) => {
      const video = videoRef.current;
      if (!video) return;

      const correctedNow = Date.now() + serverOffset;
      const elapsed =
        ((correctedNow - data.cycleStart) / 1000) % data.totalCycleDuration;

      let accumulated = 0;
      let targetOffset = 0;
      let targetUrl = data.currentFilm.url;

      const allFilms = [data.currentFilm, ...data.nextFilms];
      for (const film of allFilms) {
        if (accumulated + film.duration > elapsed) {
          targetOffset = elapsed - accumulated;
          targetUrl = film.url;
          break;
        }
        accumulated += film.duration;
      }

      if (video.src !== targetUrl) {
        video.src = targetUrl;
        video.currentTime = targetOffset;
        video.play().catch(() => {});
      } else if (Math.abs(video.currentTime - targetOffset) > SYNC_THRESHOLD) {
        video.currentTime = targetOffset;
      }
    },
    [serverOffset]
  );

  useEffect(() => {
    syncServerTime();
    fetchSchedule().then((data) => {
      if (data) syncPlayback(data);
    });

    const syncInterval = setInterval(async () => {
      await syncServerTime();
      const data = await fetchSchedule();
      if (data) syncPlayback(data);
    }, SYNC_INTERVAL);

    return () => clearInterval(syncInterval);
  }, [syncServerTime, fetchSchedule, syncPlayback]);

  useEffect(() => {
    if (!schedule) return;
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      fetchSchedule().then((data) => {
        if (data) syncPlayback(data);
      });
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [schedule, fetchSchedule, syncPlayback]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handleMouseLeave = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(false);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  };

  const toggleMute = () => {
    setMuted((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        onClick={toggleMute}
      />

      <div
        className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center gap-4 transition-opacity duration-300 z-10"
        style={{
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
          background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
        }}
      >
        <button
          onClick={toggleMute}
          className="text-[#d4cfc7] hover:text-warm cursor-pointer transition-colors shrink-0"
        >
          {muted || volume === 0 ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={muted ? 0 : volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVolume(v);
            if (v > 0) setMuted(false);
          }}
          className="w-20 h-[3px] accent-warm cursor-pointer"
        />

        <div className="flex-1" />

        <button
          onClick={toggleFullscreen}
          className="text-[#d4cfc7] hover:text-warm cursor-pointer transition-colors shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-live text-[11px] font-[var(--font-mono)] animate-[blink_1s_infinite]">
            {error}
          </span>
        </div>
      )}

      {!schedule && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-muted text-[11px] font-[var(--font-mono)]">
            synchro...
          </span>
        </div>
      )}
    </div>
  );
}
