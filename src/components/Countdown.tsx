"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  targetISO: string;
}

function compute(target: number) {
  const diff = Math.max(0, target - Date.now());
  const total = Math.floor(diff / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export default function Countdown({ targetISO }: CountdownProps) {
  const target = Date.parse(targetISO);
  const [time, setTime] = useState(() => compute(target));

  useEffect(() => {
    const id = setInterval(() => setTime(compute(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const units = [
    { value: time.days, label: "JOURS" },
    { value: time.hours, label: "HEURES" },
    { value: time.minutes, label: "MINUTES" },
    { value: time.seconds, label: "SECONDES" },
  ];

  return (
    <div
      className="flex items-baseline gap-3 sm:gap-6"
      style={{ fontFamily: "var(--font-mono)" }}
      suppressHydrationWarning
    >
      {units.map((unit, i) => (
        <div key={unit.label} className="flex items-baseline gap-3 sm:gap-6">
          <div className="flex flex-col items-center gap-2">
            <span
              className="tabular-nums leading-none text-ink"
              style={{ fontSize: "clamp(40px, 9vw, 84px)", fontWeight: 700 }}
            >
              {String(unit.value).padStart(2, "0")}
            </span>
            <span className="text-ink-3 text-[10px] tracking-[0.22em]">
              {unit.label}
            </span>
          </div>
          {i < units.length - 1 && (
            <span
              className="text-ink-4 leading-none"
              style={{ fontSize: "clamp(28px, 6vw, 56px)", fontWeight: 400 }}
              aria-hidden
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
