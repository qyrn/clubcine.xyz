"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { ScheduleState } from "@/types";

const SYNC_INTERVAL = 30_000;
const SYNC_THRESHOLD = 4;
const DRIFT_CHECK_INTERVAL = 10_000;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 15000];

type PlayerProps = {
  onControlsVisibleChange?: (visible: boolean) => void;
};

export default function Player({ onControlsVisibleChange }: PlayerProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [hasSubs, setHasSubs] = useState(false);
  const [subsOn, setSubsOn] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const lastSyncRef = useRef<{ serverTime: number; clientTime: number; offset: number; filmUrl: string } | null>(null);
  const driftTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const getExpectedOffset = useCallback(() => {
    const sync = lastSyncRef.current;
    if (!sync) return null;
    const elapsed = (Date.now() - sync.clientTime) / 1000;
    return sync.offset + elapsed;
  }, []);

  const fetchSchedule = useCallback(async (): Promise<ScheduleState | null> => {
    try {
      const before = Date.now();
      const res = await fetch("/api/schedule");
      const data: ScheduleState = await res.json();
      const rtt = Date.now() - before;
      const correctedOffset = data.currentOffset + rtt / 2000;

      lastSyncRef.current = {
        serverTime: data.serverTime ?? Date.now(),
        clientTime: Date.now(),
        offset: correctedOffset,
        filmUrl: data.currentFilm.url,
      };

      setSchedule(data);
      setError(null);
      retryCount.current = 0;
      return { ...data, currentOffset: correctedOffset };
    } catch {
      const delay = RETRY_DELAYS[Math.min(retryCount.current, RETRY_DELAYS.length - 1)];
      retryCount.current++;
      setError("signal perdu — reconnexion...");
      await new Promise((r) => setTimeout(r, delay));
      return fetchSchedule();
    }
  }, []);

  const loadFilm = useCallback((video: HTMLVideoElement, url: string, offset: number) => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    currentUrlRef.current = url;

    if (Hls.isSupported()) {
      const hls = new Hls({
        backBufferLength: 30,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.currentTime = offset;
        video.play().catch(() => {});
        const tracks = hls.subtitleTracks;
        const hasFr = tracks.length > 0;
        setHasSubs(hasFr);
        if (hasFr) {
          hls.subtitleTrack = subsOn ? 0 : -1;
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError("erreur HLS — resync...");
          setTimeout(() => forceSyncRef.current?.(), 2000);
        }
      });

      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.currentTime = offset;
      video.play().catch(() => {});
      setHasSubs(video.textTracks.length > 0);
    }
  }, [subsOn]);

  const syncPlayback = useCallback(
    (data: ScheduleState) => {
      const video = videoRef.current;
      if (!video) return;

      const targetUrl = data.currentFilm.url;
      const targetOffset = data.currentOffset;

      if (currentUrlRef.current !== targetUrl) {
        loadFilm(video, targetUrl, targetOffset);
      } else if (Math.abs(video.currentTime - targetOffset) > SYNC_THRESHOLD) {
        video.currentTime = targetOffset;
        if (video.paused) video.play().catch(() => {});
      }
    },
    [loadFilm]
  );

  const forceSyncRef = useRef<(() => Promise<void>) | null>(null);

  const forceSync = useCallback(async () => {
    const data = await fetchSchedule();
    if (data) syncPlayback(data);
  }, [fetchSchedule, syncPlayback]);

  forceSyncRef.current = forceSync;

  useEffect(() => {
    forceSync();
    const syncInterval = setInterval(forceSync, SYNC_INTERVAL);
    return () => {
      clearInterval(syncInterval);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [forceSync]);

  useEffect(() => {
    driftTimer.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || !lastSyncRef.current) return;
      const expected = getExpectedOffset();
      if (expected === null) return;
      const drift = Math.abs(video.currentTime - expected);
      if (drift > SYNC_THRESHOLD) {
        video.currentTime = expected;
      }
    }, DRIFT_CHECK_INTERVAL);
    return () => { if (driftTimer.current) clearInterval(driftTimer.current); };
  }, [getExpectedOffset]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const video = videoRef.current;
      const expected = getExpectedOffset();
      if (!video || expected === null) {
        forceSync();
        return;
      }
      const drift = Math.abs(video.currentTime - expected);
      if (drift > SYNC_THRESHOLD * 2) {
        video.currentTime = expected;
      }
      const sync = lastSyncRef.current;
      if (!sync || Date.now() - sync.clientTime > 60_000) {
        forceSync();
      }
    };
    const onOnline = () => forceSync();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [forceSync, getExpectedOffset]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onCanPlay = () => setBuffering(false);
    const onEnded = () => forceSync();

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("ended", onEnded);
    };
  }, [forceSync]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    if (hlsRef.current && hasSubs) {
      hlsRef.current.subtitleTrack = subsOn ? 0 : -1;
    }
  }, [subsOn, hasSubs]);

  useEffect(() => {
    onControlsVisibleChange?.(showControls);
  }, [showControls, onControlsVisibleChange]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  const toggleSubs = useCallback(() => {
    setSubsOn((prev) => !prev);
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.key.toLowerCase()) {
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "c":
          e.preventDefault();
          if (hasSubs) toggleSubs();
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleFullscreen, toggleMute, toggleSubs, hasSubs]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 2000);
  };

  const handleMouseLeave = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-black group ${isFullscreen ? "w-screen h-screen" : "w-full h-full"}`}
      style={{ cursor: showControls ? "auto" : "none" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        muted
        playsInline
        onClick={toggleMute}
      />

      {muted && (
        <button
          onClick={toggleMute}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black/60 rounded-full p-5 cursor-pointer transition-opacity hover:bg-black/80"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d4cfc7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        </button>
      )}

      {buffering && !error && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[18] pointer-events-none">
          <div className="w-10 h-10 border-2 border-warm/30 border-t-warm rounded-full animate-spin" />
        </div>
      )}

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

        {hasSubs && (
          <button
            onClick={toggleSubs}
            className={`cursor-pointer transition-colors shrink-0 ${subsOn ? "text-warm" : "text-[#d4cfc7] hover:text-warm"}`}
            title={subsOn ? "Désactiver sous-titres (C)" : "Activer sous-titres (C)"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
              <line x1="6" y1="11" x2="9" y2="11" />
              <line x1="11" y1="11" x2="14" y2="11" />
              <line x1="6" y1="15" x2="13" y2="15" />
              <line x1="15" y1="15" x2="18" y2="15" />
            </svg>
          </button>
        )}

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
        <div className="absolute inset-0 flex items-center justify-center z-[18]">
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
