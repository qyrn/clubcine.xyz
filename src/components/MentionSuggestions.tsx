"use client";

import { safeImageUrl } from "@/lib/safe-url";
import type { MentionCandidate } from "@/lib/use-mention-search";

interface Props {
  candidates: MentionCandidate[];
  activeIndex: number;
  onPick: (candidate: MentionCandidate) => void;
  onHover: (index: number) => void;
}

export default function MentionSuggestions({
  candidates,
  activeIndex,
  onPick,
  onHover,
}: Props) {
  return (
    <ul className="absolute bottom-full left-0 mb-2 z-30 w-[220px] max-h-[212px] overflow-y-auto border border-line bg-bg rounded-md">
      {candidates.map((c, i) => {
        const avatar = safeImageUrl(c.avatarUrl);
        const active = i === activeIndex;
        return (
          <li key={c.username}>
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
              <span className="w-6 h-6 rounded-full overflow-hidden border border-line-2 flex items-center justify-center shrink-0 text-[10px] font-semibold uppercase text-ink-2">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  c.username.charAt(0)
                )}
              </span>
              <span className="text-[12px] text-ink truncate">@{c.username}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
