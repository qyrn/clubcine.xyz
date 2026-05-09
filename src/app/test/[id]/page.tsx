"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";

type SubsSettings = {
  offset: number;
  size: number;
  position: number;
  color: string;
};

const DEFAULT_SUBS_SETTINGS: SubsSettings = {
  offset: 0,
  size: 100,
  position: 12,
  color: "#f0eae0",
};

const SUB_COLORS = [
  { value: "#f0eae0", label: "Crème" },
  { value: "#ffffff", label: "Blanc" },
  { value: "#fbbf24", label: "Ambre" },
  { value: "#86efac", label: "Vert" },
  { value: "#a5b4fc", label: "Bleu" },
];

const CDN = process.env.NEXT_PUBLIC_CDN_BASE ?? "https://cdn.clubcine.xyz";

export default function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [hasSubs, setHasSubs] = useState(false);
  const [subsOn, setSubsOn] = useState(true);
  const [subsSettings, setSubsSettings] = useState<SubsSettings>(DEFAULT_SUBS_SETTINGS);
  const [showSubsPanel, setShowSubsPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const subsOnRef = useRef(true);
  const subsSettingsRef = useRef<SubsSettings>(DEFAULT_SUBS_SETTINGS);
  const baseTimingsRef = useRef<Map<TextTrackCue, { start: number; end: number }>>(new Map());

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const url = `${CDN}/films-hls/${id}/master.m3u8`;
    setError(null);

    if (Hls.isSupported()) {
      const hls = new Hls({ backBufferLength: 30, maxBufferLength: 60 });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        const has = data.subtitleTracks.length > 0;
        setHasSubs(has);
        if (has) hls.subtitleTrack = subsOnRef.current ? 0 : -1;
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setError(`HLS ${data.details}`);
      });
      hls.attachMedia(video);
      hls.loadSource(url);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.play().catch(() => {});
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [id]);

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
    subsSettingsRef.current = subsSettings;
    const video = videoRef.current;
    if (!video) return;
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
        vtt.line = 100 - subsSettings.position;
      }
    }
  }, [subsSettings]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTrackAdd = (track: TextTrack) => {
      track.mode = subsOnRef.current ? "showing" : "hidden";
      const handleCues = () => {
        if (!track.cues) return;
        for (const cue of Array.from(track.cues)) {
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
        }
      };
      handleCues();
      track.addEventListener("cuechange", handleCues);
    };
    const onChange = () => {
      for (const track of Array.from(video.textTracks)) {
        if (track.kind === "subtitles" || track.kind === "captions") onTrackAdd(track);
      }
    };
    video.textTracks.addEventListener("addtrack", onChange);
    video.textTracks.addEventListener("change", onChange);
    onChange();
    return () => {
      video.textTracks.removeEventListener("addtrack", onChange);
      video.textTracks.removeEventListener("change", onChange);
    };
  }, [hasSubs]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  const toggleSubs = useCallback(() => setSubsOn((v) => !v), []);
  const toggleMute = useCallback(() => setMuted((v) => !v), []);

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <style>{`::cue { color: ${subsSettings.color}; font-size: ${subsSettings.size}%; background: rgba(0,0,0,0.5); text-shadow: 0 1px 3px rgba(0,0,0,0.85); }`}</style>

      <div className="bg-black/80 px-4 py-2 text-[#d4cfc7] text-sm font-mono flex items-center gap-4 border-b border-warm/20">
        <span className="text-warm uppercase tracking-wider text-xs">TEST :</span>
        <span className="font-bold">{id}</span>
        <span className="text-muted text-xs">{CDN}/films-hls/{id}/master.m3u8</span>
        {error && <span className="text-live ml-auto">{error}</span>}
      </div>

      <div className="flex-1 relative">
        <video ref={videoRef} controls autoPlay muted playsInline className="w-full h-full object-contain" />

        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button onClick={toggleMute} className="px-3 py-2 bg-black/70 hover:bg-black/90 text-[#d4cfc7] rounded text-xs font-mono">
            {muted ? "Activer son" : "Couper son"}
          </button>
          {hasSubs && (
            <>
              <button onClick={toggleSubs} className={`px-3 py-2 bg-black/70 hover:bg-black/90 rounded text-xs font-mono ${subsOn ? "text-warm" : "text-[#d4cfc7]"}`}>
                ST {subsOn ? "ON" : "OFF"}
              </button>
              <button onClick={() => setShowSubsPanel((v) => !v)} className={`px-3 py-2 bg-black/70 hover:bg-black/90 rounded text-xs font-mono ${showSubsPanel ? "text-warm" : "text-[#d4cfc7]"}`}>
                Réglages
              </button>
            </>
          )}
        </div>

        {hasSubs && showSubsPanel && (
          <div className="absolute top-16 right-4 z-20 bg-black/85 backdrop-blur border border-warm/30 rounded p-4 min-w-[280px] text-[#d4cfc7] text-xs font-mono">
            <div className="flex items-center justify-between mb-3">
              <span className="text-warm uppercase tracking-wide">Sous-titres</span>
              <button onClick={() => setSubsSettings(DEFAULT_SUBS_SETTINGS)} className="text-muted hover:text-warm text-[10px] uppercase">
                Réinitialiser
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0">Décalage</span>
                <input type="range" min="-10" max="10" step="0.1" value={subsSettings.offset}
                  onChange={(e) => setSubsSettings((s) => ({ ...s, offset: parseFloat(e.target.value) }))}
                  className="flex-1 h-[3px] accent-warm cursor-pointer" />
                <span className="w-12 text-right tabular-nums">{subsSettings.offset > 0 ? "+" : ""}{subsSettings.offset.toFixed(1)}s</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0">Taille</span>
                <input type="range" min="60" max="200" step="5" value={subsSettings.size}
                  onChange={(e) => setSubsSettings((s) => ({ ...s, size: parseInt(e.target.value) }))}
                  className="flex-1 h-[3px] accent-warm cursor-pointer" />
                <span className="w-12 text-right tabular-nums">{subsSettings.size}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0">Position</span>
                <input type="range" min="0" max="50" step="1" value={subsSettings.position}
                  onChange={(e) => setSubsSettings((s) => ({ ...s, position: parseInt(e.target.value) }))}
                  className="flex-1 h-[3px] accent-warm cursor-pointer" />
                <span className="w-12 text-right tabular-nums">{subsSettings.position}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0">Couleur</span>
                <div className="flex-1 flex gap-2">
                  {SUB_COLORS.map((c) => (
                    <button key={c.value} onClick={() => setSubsSettings((s) => ({ ...s, color: c.value }))}
                      title={c.label}
                      className={`w-5 h-5 rounded-full cursor-pointer border ${subsSettings.color === c.value ? "border-warm" : "border-transparent"}`}
                      style={{ background: c.value }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {!hasSubs && (
          <div className="absolute top-4 left-4 z-20 bg-live/80 text-black px-3 py-2 rounded text-xs font-mono">
            Aucune piste de sous-titres dans ce film
          </div>
        )}
      </div>
    </div>
  );
}
