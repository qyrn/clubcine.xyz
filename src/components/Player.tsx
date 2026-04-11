"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ScheduleState } from "@/types";

const SYNC_INTERVAL = 30_000;
const SYNC_THRESHOLD = 3;

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

export default function Player() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [schedule, setSchedule] = useState<ScheduleState | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [subsOn, setSubsOn] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [cueText, setCueText] = useState("");
  const [subSettings, setSubSettings] = useState<SubSettings>(DEFAULT_SUB_SETTINGS);
  const [showSubSettings, setShowSubSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

      const targetUrl = data.currentFilm.url;
      const targetOffset = data.currentOffset;

      if (video.src !== targetUrl) {
        video.src = targetUrl;
        video.currentTime = targetOffset;
        video.play().catch(() => {});
      } else if (Math.abs(video.currentTime - targetOffset) > SYNC_THRESHOLD) {
        video.currentTime = targetOffset;
      }
    },
    []
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem("subSettings");
      if (stored) setSubSettings({ ...DEFAULT_SUB_SETTINGS, ...JSON.parse(stored) });
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("subSettings", JSON.stringify(subSettings));
    } catch {
      /* noop */
    }
  }, [subSettings]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCueChange = (e: Event) => {
      const track = e.target as TextTrack;
      if (!track.activeCues || track.activeCues.length === 0) {
        setCueText("");
        return;
      }
      const text = Array.from(track.activeCues)
        .map((cue) => (cue as VTTCue).text)
        .join("\n");
      setCueText(text);
    };

    const listeners: Array<[TextTrack, EventListener]> = [];
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      track.mode = subsOn ? "hidden" : "disabled";
      track.addEventListener("cuechange", handleCueChange);
      listeners.push([track, handleCueChange]);
    }

    if (!subsOn) setCueText("");

    return () => {
      listeners.forEach(([track, fn]) => track.removeEventListener("cuechange", fn));
    };
  }, [subsOn, schedule]);

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
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handleMouseLeave = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-black group ${isFullscreen ? "w-screen h-screen" : "w-full h-full"}`}
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
      >
        {schedule?.currentFilm.subtitles?.map((sub) => (
          <track
            key={sub.lang}
            kind="subtitles"
            label={sub.label}
            srcLang={sub.lang}
            src={sub.url}
            default={sub.lang === "fr"}
          />
        ))}
      </video>

      {subsOn && cueText && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[15] flex flex-col items-center gap-1 pointer-events-none max-w-[85%]"
          style={{
            bottom: `${subSettings.bottom}%`,
          }}
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
