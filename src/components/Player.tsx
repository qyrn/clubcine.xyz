"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ScheduleState } from "@/types";

const SYNC_INTERVAL = 30_000;
const SYNC_THRESHOLD = 3;

export default function Player() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [schedule, setSchedule] = useState<ScheduleState | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
      setError("Signal perdu...");
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

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
      />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <p className="font-[var(--font-display)] text-red text-xs animate-[blink_1s_infinite]">
            {error}
          </p>
        </div>
      )}

      {!schedule && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <p className="font-[var(--font-display)] text-accent text-xs animate-[blink_1s_infinite]">
            SYNCHRO...
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)]" />
    </div>
  );
}
