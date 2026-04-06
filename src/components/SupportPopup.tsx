"use client";

import { useEffect, useState } from "react";

export default function SupportPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("qyrn-support-dismissed");
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 15_000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("qyrn-support-dismissed", Date.now().toString());
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 border border-border bg-[#111] max-w-xs w-full shadow-2xl">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[12px] text-white font-[var(--font-ui)] uppercase tracking-wide">
          soutenir tv.qyrn
        </span>
        <button
          onClick={dismiss}
          className="text-muted text-[16px] leading-none hover:text-white cursor-pointer"
        >
          &times;
        </button>
      </div>

      <div className="px-4 pb-3 pt-1">
        <p className="text-[12px] text-[#999] leading-relaxed mb-3">
          On finance le serveur nous-m&ecirc;mes pour rester{" "}
          <span className="text-live">sans pubs</span>. Toute aide est la
          bienvenue pour faire tourner la projection.
        </p>

        <a
          href="https://ko-fi.com/qyrnsec"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 border border-warm/30 text-warm text-[12px] font-[var(--font-ui)] uppercase tracking-wide text-center py-2.5 hover:bg-warm/10 cursor-pointer"
        >
          faire un don
        </a>
      </div>

      <button
        onClick={dismiss}
        className="w-full text-[11px] text-muted py-2 hover:text-warm/60 cursor-pointer border-t border-border font-[var(--font-ui)]"
      >
        [ peut-&ecirc;tre plus tard ]
      </button>
    </div>
  );
}
