"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { ScheduleState } from "@/types";
import IntermissionOverlay from "./IntermissionOverlay";

const SYNC_INTERVAL = 30_000;
const SYNC_THRESHOLD = 4;
const DRIFT_CHECK_INTERVAL = 10_000;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 15000];

type SubsSettings = {
  offset: number;
  size: number;
  position: number;
  color: string;
};

const DEFAULT_SUBS_SETTINGS: SubsSettings = {
  offset: 0,
  size: 80,
  position: 14,
  color: "#ffffff",
};

const SUB_COLORS = [
  { value: "#ffffff", label: "Blanc" },
  { value: "#f0eae0", label: "Crème" },
  { value: "#fbbf24", label: "Ambre" },
  { value: "#86efac", label: "Vert" },
  { value: "#a5b4fc", label: "Bleu" },
];

const SUBS_STORAGE_KEY = "clubcine-subs-settings";
const SUBS_ON_STORAGE_KEY = "clubcine-subs-on";

type PlayerProps = {
  onControlsVisibleChange?: (visible: boolean) => void;
};

export default function Player({ onControlsVisibleChange }: PlayerProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const wasIntermissionRef = useRef(false);
  const fadingRef = useRef(false);
  const fadeRafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [schedule, setSchedule] = useState<ScheduleState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [hasSubs, setHasSubs] = useState(false);
  const [subsOn, setSubsOn] = useState(true);
  const [subsSettings, setSubsSettings] = useState<SubsSettings>(DEFAULT_SUBS_SETTINGS);
  const [showSubsPanel, setShowSubsPanel] = useState(false);
  const [intermissionLeft, setIntermissionLeft] = useState<number | null>(null);
  const subsOnRef = useRef(true);
  const subsSettingsRef = useRef<SubsSettings>(DEFAULT_SUBS_SETTINGS);
  const baseTimingsRef = useRef<Map<TextTrackCue, { start: number; end: number }>>(new Map());
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
    if (!mountedRef.current) return null;
    try {
      const before = Date.now();
      const res = await fetch("/api/schedule");
      const data: ScheduleState = await res.json();
      if (!mountedRef.current) return null;
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
      if (!mountedRef.current) return null;
      const delay = RETRY_DELAYS[Math.min(retryCount.current, RETRY_DELAYS.length - 1)];
      retryCount.current++;
      setError("signal perdu, reconnexion...");
      await new Promise<void>((r) => {
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          r();
        }, delay);
      });
      if (!mountedRef.current) return null;
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
        startPosition: offset,
        backBufferLength: 30,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((e) => console.warn("[HLS] play failed:", e));
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        const tracksAvail = data.subtitleTracks.length > 0;
        setHasSubs(tracksAvail);
        if (tracksAvail) {
          hls.subtitleTrack = subsOnRef.current ? 0 : -1;
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        console.error("[HLS]", data.type, data.details, "FATAL");
        setError("erreur HLS, resync...");
        setTimeout(() => forceSyncRef.current?.(), 2000);
      });

      hls.attachMedia(video);
      hls.loadSource(url);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.currentTime = offset;
      video.play().catch(() => {});
      setHasSubs(video.textTracks.length > 0);
    }
  }, []);

  const syncPlayback = useCallback(
    (data: ScheduleState) => {
      const video = videoRef.current;
      if (!video) return;

      if (data.intermission) {
        if (!video.paused) video.pause();
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        currentUrlRef.current = null;
        setIntermissionLeft(data.intermission.secondsLeft);
        return;
      }

      setIntermissionLeft(null);

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
    if (!mountedRef.current) return;
    if (data) syncPlayback(data);
  }, [fetchSchedule, syncPlayback]);

  useEffect(() => {
    forceSyncRef.current = forceSync;
  }, [forceSync]);

  useEffect(() => {
    mountedRef.current = true;
    forceSync();
    const syncInterval = setInterval(forceSync, SYNC_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(syncInterval);
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
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
    video.muted = muted;
    if (fadingRef.current) return;
    if (intermissionLeft !== null && intermissionLeft > 0) {
      video.volume = 0;
      return;
    }
    video.volume = volume;
  }, [volume, muted, intermissionLeft]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const inIntermission = intermissionLeft !== null && intermissionLeft > 0;
    if (inIntermission) {
      if (fadeRafRef.current !== null) {
        cancelAnimationFrame(fadeRafRef.current);
        fadeRafRef.current = null;
      }
      fadingRef.current = false;
      video.volume = 0;
      wasIntermissionRef.current = true;
      return;
    }
    if (!wasIntermissionRef.current) return;
    wasIntermissionRef.current = false;
    fadingRef.current = true;
    const FADE_MS = 2500;
    const startTime = performance.now();
    const step = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / FADE_MS);
      const eased = t * t * (3 - 2 * t);
      const target = muted ? 0 : volume;
      if (videoRef.current) videoRef.current.volume = target * eased;
      if (t < 1) {
        fadeRafRef.current = requestAnimationFrame(step);
      } else {
        fadeRafRef.current = null;
        fadingRef.current = false;
      }
    };
    fadeRafRef.current = requestAnimationFrame(step);
    return () => {
      if (fadeRafRef.current !== null) {
        cancelAnimationFrame(fadeRafRef.current);
        fadeRafRef.current = null;
      }
      fadingRef.current = false;
    };
  }, [intermissionLeft, volume, muted]);

  useEffect(() => {
    subsOnRef.current = subsOn;
    if (hlsRef.current && hasSubs) {
      hlsRef.current.subtitleTrack = subsOn ? 0 : -1;
    }
    const video = videoRef.current;
    if (video) {
      for (const track of Array.from(video.textTracks)) {
        if (track.kind === "subtitles" || track.kind === "captions") {
          track.mode = subsOn ? "showing" : "hidden";
        }
      }
    }
  }, [subsOn, hasSubs]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SUBS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SubsSettings>;
        setSubsSettings({ ...DEFAULT_SUBS_SETTINGS, ...parsed });
      }
      const onRaw = localStorage.getItem(SUBS_ON_STORAGE_KEY);
      if (onRaw !== null) setSubsOn(onRaw === "1");
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SUBS_ON_STORAGE_KEY, subsOn ? "1" : "0");
    } catch {}
  }, [subsOn]);

  useEffect(() => {
    subsSettingsRef.current = subsSettings;
    try {
      localStorage.setItem(SUBS_STORAGE_KEY, JSON.stringify(subsSettings));
    } catch {}
    const video = videoRef.current;
    if (!video) return;
    const effectivePosition = showControls
      ? Math.max(subsSettings.position, 26)
      : subsSettings.position;
    for (const track of Array.from(video.textTracks)) {
      if (!track.cues) continue;
      for (const cue of Array.from(track.cues)) {
        const base = baseTimingsRef.current.get(cue);
        if (base) {
          cue.startTime = base.start + subsSettings.offset;
          cue.endTime = base.end + subsSettings.offset;
        }
        const vtt = cue as VTTCue;
        vtt.snapToLines = false;
        vtt.line = 100 - effectivePosition;
      }
    }
  }, [subsSettings, showControls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyToCue = (cue: TextTrackCue) => {
      if (!baseTimingsRef.current.has(cue)) {
        baseTimingsRef.current.set(cue, { start: cue.startTime, end: cue.endTime });
        const s = subsSettingsRef.current;
        if (s.offset !== 0) {
          cue.startTime += s.offset;
          cue.endTime += s.offset;
        }
        const vtt = cue as VTTCue;
        vtt.snapToLines = false;
        vtt.line = 100 - s.position;
      }
    };

    const onTrackAdd = (track: TextTrack) => {
      track.mode = subsOnRef.current ? "showing" : "hidden";
      const handleCues = () => {
        if (!track.cues) return;
        for (const cue of Array.from(track.cues)) {
          applyToCue(cue);
        }
      };
      handleCues();
      track.addEventListener("cuechange", handleCues);
    };

    const onTracksChange = () => {
      for (const track of Array.from(video.textTracks)) {
        if (track.kind === "subtitles" || track.kind === "captions") {
          onTrackAdd(track);
        }
      }
    };

    video.textTracks.addEventListener("addtrack", onTracksChange);
    video.textTracks.addEventListener("change", onTracksChange);
    onTracksChange();

    return () => {
      video.textTracks.removeEventListener("addtrack", onTracksChange);
      video.textTracks.removeEventListener("change", onTracksChange);
    };
  }, [hasSubs]);

  useEffect(() => {
    onControlsVisibleChange?.(showControls);
  }, [showControls, onControlsVisibleChange]);

  useEffect(() => {
    if (intermissionLeft === null || intermissionLeft <= 0) return;
    const tick = setInterval(() => {
      setIntermissionLeft((prev) => {
        if (prev === null) return null;
        const next = prev - 1;
        if (next <= 0) {
          forceSyncRef.current?.();
          return null;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [intermissionLeft]);

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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black/60 p-5 cursor-pointer transition-opacity hover:bg-black/80"
          aria-label="activer le son"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        </button>
      )}

      {buffering && !error && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[18] pointer-events-none">
          <div className="w-10 h-10 border-2 border-line-2 border-t-ink rounded-full animate-spin" />
        </div>
      )}

      <style>{`::cue { color: ${subsSettings.color}; font-size: ${subsSettings.size}%; }`}</style>

      {hasSubs && showSubsPanel && showControls && (
        <div className="absolute bottom-16 right-4 z-20 bg-black/85 backdrop-blur-sm border border-line-2 px-4 py-3 min-w-[260px] text-ink text-[11px] font-mono">
          <div className="flex items-center justify-between mb-3">
            <span className="text-ink uppercase tracking-[0.16em] font-semibold">Sous-titres</span>
            <button
              onClick={() => setSubsSettings(DEFAULT_SUBS_SETTINGS)}
              className="text-ink-3 hover:text-ink cursor-pointer text-[10px] uppercase tracking-[0.08em]"
            >
              Réinitialiser
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-ink-2">Décalage</span>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={subsSettings.offset}
                onChange={(e) => setSubsSettings((s) => ({ ...s, offset: parseFloat(e.target.value) }))}
                className="flex-1 h-[3px] accent-red cursor-pointer"
              />
              <span className="w-12 text-right tabular-nums">{subsSettings.offset > 0 ? "+" : ""}{subsSettings.offset.toFixed(1)}s</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-ink-2">Taille</span>
              <input
                type="range"
                min="60"
                max="200"
                step="5"
                value={subsSettings.size}
                onChange={(e) => setSubsSettings((s) => ({ ...s, size: parseInt(e.target.value) }))}
                className="flex-1 h-[3px] accent-red cursor-pointer"
              />
              <span className="w-12 text-right tabular-nums">{subsSettings.size}%</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-ink-2">Position</span>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={subsSettings.position}
                onChange={(e) => setSubsSettings((s) => ({ ...s, position: parseInt(e.target.value) }))}
                className="flex-1 h-[3px] accent-red cursor-pointer"
              />
              <span className="w-12 text-right tabular-nums">{subsSettings.position}%</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-ink-2">Couleur</span>
              <div className="flex-1 flex gap-2">
                {SUB_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setSubsSettings((s) => ({ ...s, color: c.value }))}
                    title={c.label}
                    className={`w-5 h-5 cursor-pointer border ${subsSettings.color === c.value ? "border-red" : "border-transparent"}`}
                    style={{ background: c.value }}
                  />
                ))}
              </div>
            </div>
          </div>
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
          className="text-ink hover:text-red cursor-pointer transition-colors shrink-0"
          aria-label={muted ? "activer le son" : "couper le son"}
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
          className="w-20 h-[3px] accent-red cursor-pointer"
        />

        <div className="flex-1" />

        {hasSubs && (
          <>
            <button
              onClick={toggleSubs}
              className={`cursor-pointer transition-colors shrink-0 ${subsOn ? "text-red" : "text-ink hover:text-red"}`}
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
            <button
              onClick={() => setShowSubsPanel((v) => !v)}
              className={`cursor-pointer transition-colors shrink-0 ${showSubsPanel ? "text-red" : "text-ink hover:text-red"}`}
              title="Réglages sous-titres"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </>
        )}

        <button
          onClick={toggleFullscreen}
          className="text-ink hover:text-red cursor-pointer transition-colors shrink-0"
          aria-label="plein écran"
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
          <span className="text-red text-[11px] font-mono uppercase tracking-[0.16em] animate-[pulse-dot_1.5s_infinite]">
            {error}
          </span>
        </div>
      )}

      {schedule?.intermission && (
        <IntermissionOverlay
          title={schedule.currentFilm.title}
          director={schedule.currentFilm.director}
          year={schedule.currentFilm.year}
          posterUrl={schedule.currentFilm.poster}
          musicUrl={schedule.currentFilm.music}
          secondsLeft={intermissionLeft}
        />
      )}

      {!schedule && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-ink-3 text-[11px] font-mono uppercase tracking-[0.16em]">
            synchro...
          </span>
        </div>
      )}
    </div>
  );
}
