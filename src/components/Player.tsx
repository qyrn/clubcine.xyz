"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ScheduleState } from "@/types";

const SYNC_INTERVAL = 15_000;
const SYNC_THRESHOLD = 2;
const DRIFT_CHECK_INTERVAL = 5_000;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 15000];

interface SubSettings {
  fontSize: number;
  bottom: number;
  color: string;
  bgOpacity: number;
}

const DEFAULT_SUB_SETTINGS: SubSettings = {
  fontSize: 22,
  bottom: 10,
  color: "#f5f0e8",
  bgOpacity: 0.6,
};

const SUB_COLORS = ["#f5f0e8", "#ffffff", "#c4a97d", "#e8d197", "#ffde59"];

interface VTTCueItem {
  start: number;
  end: number;
  text: string;
}

function parseVTTTimestamp(s: string): number {
  const parts = s.trim().split(":");
  if (parts.length === 3) {
    return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
  }
  return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
}

function parseVTT(text: string): VTTCueItem[] {
  const lines = text.split(/\r?\n/);
  const cues: VTTCueItem[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const arrow = line.indexOf(" --> ");
    if (arrow !== -1) {
      const start = parseVTTTimestamp(line.slice(0, arrow));
      const end = parseVTTTimestamp(line.slice(arrow + 5).split(" ")[0]);
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i]);
        i++;
      }
      if (!isNaN(start) && !isNaN(end)) {
        cues.push({ start, end, text: textLines.join("\n") });
      }
    }
    i++;
  }
  return cues;
}

type PlayerProps = {
  onControlsVisibleChange?: (visible: boolean) => void;
};

export default function Player({ onControlsVisibleChange }: PlayerProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [schedule, setSchedule] = useState<ScheduleState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [subsOn, setSubsOn] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [cueText, setCueText] = useState("");
  const [subSettings, setSubSettings] = useState<SubSettings>(DEFAULT_SUB_SETTINGS);
  const [showSubSettings, setShowSubSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(false);
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

  const syncPlayback = useCallback(
    (data: ScheduleState) => {
      const video = videoRef.current;
      if (!video) return;

      const targetUrl = data.currentFilm.url;
      const targetOffset = data.currentOffset;

      if (!video.src || !video.src.includes(new URL(targetUrl, location.origin).pathname.split("/").pop()!)) {
        video.src = targetUrl;
        video.currentTime = targetOffset;
        video.play().catch(() => {});
      } else if (Math.abs(video.currentTime - targetOffset) > SYNC_THRESHOLD) {
        video.currentTime = targetOffset;
        if (video.paused) video.play().catch(() => {});
      }
    },
    []
  );

  const forceSync = useCallback(async () => {
    const data = await fetchSchedule();
    if (data) syncPlayback(data);
  }, [fetchSchedule, syncPlayback]);

  useEffect(() => {
    forceSync();
    const syncInterval = setInterval(forceSync, SYNC_INTERVAL);
    return () => clearInterval(syncInterval);
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
      if (document.visibilityState === "visible") forceSync();
    };
    const onOnline = () => forceSync();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [forceSync]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onCanPlay = () => {
      const expected = getExpectedOffset();
      if (expected !== null && Math.abs(video.currentTime - expected) > SYNC_THRESHOLD) {
        video.currentTime = expected;
      }
      video.play().catch(() => {});
      setBuffering(false);
    };

    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);

    const onError = () => {
      setError("erreur de lecture — resync...");
      setTimeout(forceSync, 2000);
    };

    const onEnded = () => forceSync();

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
      video.removeEventListener("ended", onEnded);
    };
  }, [forceSync, getExpectedOffset]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("subSettings");
      if (stored) setSubSettings({ ...DEFAULT_SUB_SETTINGS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("subSettings", JSON.stringify(subSettings));
    } catch {}
  }, [subSettings]);

  const cuesRef = useRef<VTTCueItem[]>([]);

  useEffect(() => {
    const sub = schedule?.currentFilm.subtitles?.find((s) => s.lang === "fr");
    if (!sub) {
      cuesRef.current = [];
      setCueText("");
      return;
    }
    let cancelled = false;
    fetch(sub.url)
      .then((r) => (r.ok ? r.text() : ""))
      .then((text) => {
        if (cancelled) return;
        cuesRef.current = parseVTT(text);
      })
      .catch(() => {
        if (!cancelled) cuesRef.current = [];
      });
    return () => {
      cancelled = true;
    };
  }, [schedule?.currentFilm.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!subsOn) {
      setCueText("");
      return;
    }
    const handleTime = () => {
      const t = video.currentTime;
      const cue = cuesRef.current.find((c) => t >= c.start && t <= c.end);
      setCueText(cue?.text || "");
    };
    video.addEventListener("timeupdate", handleTime);
    return () => video.removeEventListener("timeupdate", handleTime);
  }, [subsOn, schedule?.currentFilm.id]);

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
        case "s":
          e.preventDefault();
          setSubsOn((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleFullscreen, toggleMute]);

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

      {subsOn && cueText && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[15] flex flex-col items-center gap-1 pointer-events-none max-w-[85%]"
          style={{ bottom: `${subSettings.bottom}%` }}
        >
          {cueText.split("\n").map((line, i) => (
            <span
              key={i}
              className="px-3 py-1 leading-snug text-center"
              style={{
                fontSize: `${subSettings.fontSize}px`,
                color: subSettings.color,
                backgroundColor: `rgba(0,0,0,${subSettings.bgOpacity})`,
                textShadow: "0 1px 2px rgba(0,0,0,0.9)",
                fontFamily: "var(--font-body)",
                fontWeight: 500,
              }}
            >
              {line}
            </span>
          ))}
        </div>
      )}

      {showSubSettings && (
        <div
          className="absolute bottom-16 right-4 z-20 bg-black/90 border border-border rounded-sm p-4 w-[240px] text-[11px] font-[var(--font-body)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-warm uppercase tracking-wide">sous-titres</span>
            <button
              onClick={() => setSubSettings(DEFAULT_SUB_SETTINGS)}
              className="text-dim hover:text-warm cursor-pointer transition-colors text-[10px]"
            >
              reset
            </button>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1 text-[#d4cfc7]">
              <span>taille</span>
              <span className="text-dim font-[var(--font-mono)]">{subSettings.fontSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="40"
              step="1"
              value={subSettings.fontSize}
              onChange={(e) => setSubSettings((s) => ({ ...s, fontSize: parseInt(e.target.value) }))}
              className="w-full h-[3px] accent-warm cursor-pointer"
            />
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1 text-[#d4cfc7]">
              <span>position</span>
              <span className="text-dim font-[var(--font-mono)]">{subSettings.bottom}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              step="1"
              value={subSettings.bottom}
              onChange={(e) => setSubSettings((s) => ({ ...s, bottom: parseInt(e.target.value) }))}
              className="w-full h-[3px] accent-warm cursor-pointer"
            />
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1 text-[#d4cfc7]">
              <span>fond</span>
              <span className="text-dim font-[var(--font-mono)]">{Math.round(subSettings.bgOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={subSettings.bgOpacity}
              onChange={(e) => setSubSettings((s) => ({ ...s, bgOpacity: parseFloat(e.target.value) }))}
              className="w-full h-[3px] accent-warm cursor-pointer"
            />
          </div>

          <div>
            <div className="text-[#d4cfc7] mb-2">couleur</div>
            <div className="flex gap-2">
              {SUB_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSubSettings((s) => ({ ...s, color }))}
                  className="w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110"
                  style={{
                    background: color,
                    outline: subSettings.color === color ? "2px solid var(--color-warm)" : "1px solid var(--color-border)",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

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

        {schedule?.currentFilm.subtitles && schedule.currentFilm.subtitles.length > 0 && (
          <>
            <button
              onClick={() => setSubsOn((prev) => !prev)}
              className={`text-[11px] font-[var(--font-mono)] cursor-pointer transition-colors shrink-0 ${subsOn ? "text-warm" : "text-dim"}`}
            >
              ST
            </button>
            {subsOn && (
              <button
                onClick={() => setShowSubSettings((prev) => !prev)}
                className={`cursor-pointer transition-colors shrink-0 ${showSubSettings ? "text-warm" : "text-[#d4cfc7] hover:text-warm"}`}
                title="réglages sous-titres"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            )}
          </>
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
