"use client";

import { useEffect, useState } from "react";

const PERMANENT_THRESHOLD_MS = 50 * 365 * 24 * 60 * 60 * 1000;

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}j ${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function ChatBanNotice({
  untilMs,
  reason,
  compact,
}: {
  untilMs: number;
  reason: string | null;
  compact: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const permanent = untilMs - now > PERMANENT_THRESHOLD_MS;

  useEffect(() => {
    if (permanent) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [permanent]);

  return (
    <div
      className={`border-red bg-red/10 ${
        compact ? "border-t p-3" : "border rounded-md p-4"
      }`}
    >
      <div className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-red mb-1.5">
        ✕ Tu es banni du chat
      </div>
      {reason && (
        <p className="text-[12px] leading-[1.4] text-ink-2 mb-2 break-words">
          Motif : {reason}
        </p>
      )}
      <div className="font-mono text-[11px] tracking-[0.04em] text-ink-3">
        {permanent ? (
          "Bannissement définitif"
        ) : (
          <>
            Fin du ban dans{" "}
            <span className="text-ink tabular-nums">{formatRemaining(untilMs - now)}</span>
          </>
        )}
      </div>
    </div>
  );
}
