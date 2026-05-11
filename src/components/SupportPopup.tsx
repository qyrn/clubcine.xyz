"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "clubcine-support-dismissed";
const DELAY_MS = 20_000;
const REPROMPT_DAYS = 14;

export default function SupportPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const ts = Number(dismissed);
      if (!Number.isNaN(ts)) {
        const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
        if (ageDays < REPROMPT_DAYS) return;
      }
    }
    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Soutenir club ciné"
      className="fixed bottom-4 right-4 z-50 border border-line bg-bg max-w-[300px] w-[calc(100vw-2rem)] rounded-md shadow-2xl overflow-hidden"
    >
      <div className="px-4 py-2.5 border-b border-line flex items-center justify-between">
        <div className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-red">
          ★ Soutenir
        </div>
        <button
          onClick={dismiss}
          aria-label="fermer"
          className="text-ink-3 hover:text-red text-[18px] leading-none cursor-pointer transition-colors"
        >
          ×
        </button>
      </div>

      <div className="px-4 py-3 flex flex-col items-center gap-2.5">
        <p className="text-[13px] leading-[1.65] text-ink-2 text-center">
          Les films sont diffusés 24/7
          <br />
          Pour que le site tienne dans le temps
          <br />
          Fais-moi un petit don pour le VPS
          <br />
          Merci beaucoup <span className="text-red">❤︎</span>
        </p>
        <p className="font-mono text-[10px] tracking-[0.04em] text-ink-3 text-center text-balance">
          ★ badge supporter + role soutien auto
        </p>

        <a
          href="https://ko-fi.com/clubcinefr"
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-ink bg-transparent text-ink font-semibold text-[12px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors rounded-md mt-1"
        >
          Ko-fi <span aria-hidden>→</span>
        </a>
      </div>
    </div>
  );
}
