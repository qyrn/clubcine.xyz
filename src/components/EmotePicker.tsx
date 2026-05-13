"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Emote } from "@/lib/use-emotes";
import { useEscapeKey } from "@/lib/use-escape-key";

interface EmotePickerProps {
  emotes: Map<string, Emote>;
  onPick: (slug: string) => void;
  compact?: boolean;
}

export default function EmotePicker({ emotes, onPick, compact = false }: EmotePickerProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setFilter("");
  };

  useEscapeKey(close, open);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) close();
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const list = useMemo(() => {
    const arr = Array.from(emotes.values());
    const q = filter.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter(
      (e) => e.slug.includes(q) || e.label.toLowerCase().includes(q)
    );
  }, [emotes, filter]);

  const panelW = compact ? 220 : 280;
  const tileSize = compact ? 32 : 36;

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="emotes"
        aria-label="ouvrir le picker d'emotes"
        className={`border border-line-2 text-ink-3 hover:text-ink hover:border-ink cursor-pointer transition-colors flex items-center justify-center ${
          compact ? "h-[28px] w-[28px]" : "h-[40px] w-[40px]"
        }`}
      >
        <svg width={compact ? 14 : 16} height={compact ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 bottom-full mb-2 z-30 bg-bg border border-line-2 shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
          style={{ width: panelW }}
        >
          <div className="border-b border-line-2 p-2">
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="chercher…"
              className="w-full bg-transparent border border-line-2 px-2 py-1.5 text-[11px] text-ink placeholder:text-ink-3 outline-none focus:border-ink transition-colors"
            />
          </div>

          <div className="p-2 max-h-[240px] overflow-y-auto">
            {list.length === 0 ? (
              <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-3 py-6 text-center">
                {emotes.size === 0 ? "aucune emote" : "rien trouvé"}
              </div>
            ) : (
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${tileSize}px, 1fr))` }}
              >
                {list.map((e) => (
                  <button
                    key={e.slug}
                    type="button"
                    onClick={() => {
                      onPick(e.slug);
                      close();
                    }}
                    title={`:${e.slug}:${e.label ? ` · ${e.label}` : ""}`}
                    className="aspect-square flex items-center justify-center border border-transparent hover:border-red hover:bg-line cursor-pointer transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.imageUrl}
                      alt={e.label || `:${e.slug}:`}
                      loading="lazy"
                      draggable={false}
                      className="max-h-[80%] max-w-[80%] select-none"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
