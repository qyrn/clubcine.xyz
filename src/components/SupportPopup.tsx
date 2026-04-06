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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85">
      <div className="border border-border bg-black max-w-sm w-full mx-4 p-5">
        <div className="text-[10px] text-muted font-[var(--font-ui)] mb-3">soutenir tv.qyrn</div>

        <p className="text-[13px] text-[#999] leading-relaxed mb-2">
          On finance le serveur nous-memes pour rester sans pubs.
          Toute aide est la bienvenue pour faire tourner la projection.
        </p>

        <p className="text-[11px] text-muted mb-5 italic">
          Hebergement, bande passante, catalogue — tout coute.
        </p>

        <div className="flex flex-col gap-2">
          <a
            href="https://ko-fi.com/qyrnsec"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-warm/30 text-warm text-[11px] font-[var(--font-ui)] text-center py-2 hover:bg-warm/10 cursor-pointer"
          >
            faire un don
          </a>
          <button
            onClick={dismiss}
            className="text-[11px] text-muted py-2 hover:text-warm/60 cursor-pointer"
          >
            peut-etre plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
