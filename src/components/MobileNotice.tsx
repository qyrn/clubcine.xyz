"use client";

import { useEffect, useState } from "react";
import { readStorage, writeStorage } from "@/lib/safe-storage";

const DISMISS_KEY = "clubcine-mobile-notice-dismissed";
const MOBILE_QUERY = "(max-width: 767px)";

export default function MobileNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readStorage(DISMISS_KEY) === "1") return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => setVisible(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    writeStorage(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-[440px] border border-line-2 bg-bg/95 backdrop-blur-sm rounded-md shadow-[0_8px_28px_rgba(0,0,0,0.7)] px-4 py-3.5 flex items-start gap-3">
        <span className="text-red shrink-0 mt-0.5" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </span>
        <div className="min-w-0 flex flex-col gap-1.5">
          <div className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-red">
            Mieux sur ordinateur
          </div>
          <p className="text-[12px] leading-[1.55] text-ink-2 break-words">
            Le site est pensé pour le grand écran. Sur mobile, certaines choses sont moins
            confortables : on fait au mieux pour que toutes les plateformes puissent regarder
            des films.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="self-start mt-0.5 font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 hover:text-red transition-colors cursor-pointer"
          >
            Compris
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          className="shrink-0 text-ink-3 hover:text-ink transition-colors cursor-pointer text-[12px] leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
