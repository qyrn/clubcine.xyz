"use client";

import { useEffect, useState } from "react";
import { readStorage, writeStorage } from "@/lib/safe-storage";
import { useEscapeKey } from "@/lib/use-escape-key";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

const DISMISS_KEY = "clubcine-mobile-notice-dismissed";
const MOBILE_QUERY = "(max-width: 767px)";
const REPROMPT_DAYS = 14;
const REPROMPT_MS = REPROMPT_DAYS * 24 * 60 * 60 * 1000;

function dismissedRecently(): boolean {
  const raw = readStorage(DISMISS_KEY);
  if (!raw) return false;
  const at = Number(raw);
  if (!Number.isFinite(at)) return false;
  return Date.now() - at < REPROMPT_MS;
}

export default function MobileNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (dismissedRecently()) return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => setVisible(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const dismiss = () => {
    writeStorage(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  useEscapeKey(dismiss, visible);
  useBodyScrollLock(visible);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 px-5"
      onClick={dismiss}
    >
      <div
        className="border border-line-2 bg-bg rounded-md max-w-[360px] w-full p-6 flex flex-col items-center text-center gap-4 shadow-[0_8px_28px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-red" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </span>
        <div className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-red">
          Mieux sur ordinateur
        </div>
        <p className="text-[13px] leading-[1.6] text-ink-2 break-words">
          Le site est pensé pour le grand écran. Sur mobile, certaines choses sont moins
          confortables : on fait au mieux pour que toutes les plateformes puissent regarder des
          films.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="w-full border border-ink bg-transparent text-ink text-[12px] font-semibold py-2.5 hover:border-red hover:text-red cursor-pointer transition-colors uppercase tracking-[0.12em]"
        >
          OK
        </button>
      </div>
    </div>
  );
}
