"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "clubcine-support-dismissed";

export default function SupportPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;
    const timer = setTimeout(() => setVisible(true), 15_000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 border border-line bg-bg max-w-xs w-full shadow-2xl">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink">
          Soutenir clubcine
        </span>
        <button
          onClick={dismiss}
          className="text-ink-3 text-[18px] leading-none hover:text-ink cursor-pointer transition-colors"
          aria-label="fermer"
        >
          ×
        </button>
      </div>

      <div className="px-4 pb-3 pt-2">
        <p className="text-[12px] text-ink-2 leading-relaxed mb-3">
          On finance le serveur nous-mêmes pour rester{" "}
          <span className="text-red font-semibold">sans pubs</span>. Toute aide
          est la bienvenue pour faire tourner la projection.
        </p>

        <a
          href="https://ko-fi.com/clubcinefr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center border border-ink bg-transparent text-ink text-[12px] font-semibold uppercase tracking-[0.04em] py-2.5 hover:border-red hover:text-red transition-colors"
        >
          Faire un don
        </a>
      </div>

      <button
        onClick={dismiss}
        className="w-full text-[11px] text-ink-3 py-2 hover:text-ink cursor-pointer border-t border-line transition-colors"
      >
        peut-être plus tard
      </button>
    </div>
  );
}
