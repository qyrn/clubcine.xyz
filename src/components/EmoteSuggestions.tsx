"use client";

import type { Emote } from "@/lib/use-emotes";
import { safeImageUrl } from "@/lib/safe-url";

interface Props {
  candidates: Emote[];
  activeIndex: number;
  onPick: (emote: Emote) => void;
  onHover: (index: number) => void;
}

export default function EmoteSuggestions({
  candidates,
  activeIndex,
  onPick,
  onHover,
}: Props) {
  return (
    <ul className="absolute bottom-full left-0 mb-2 z-30 w-[240px] max-h-[224px] overflow-y-auto border border-line bg-bg rounded-md">
      {candidates.map((c, i) => {
        const src = safeImageUrl(c.imageUrl);
        const active = i === activeIndex;
        return (
          <li key={c.slug}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(c);
              }}
              onMouseEnter={() => onHover(i)}
              className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-left cursor-pointer transition-colors ${
                active ? "bg-line" : "hover:bg-line/50"
              }`}
            >
              <span className="w-6 h-6 flex items-center justify-center shrink-0">
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" loading="lazy" className="max-w-full max-h-full" />
                )}
              </span>
              <span className="font-mono text-[12px] text-ink truncate">:{c.slug}:</span>
              {c.label && (
                <span className="text-[11px] text-ink-3 truncate ml-auto">{c.label}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
