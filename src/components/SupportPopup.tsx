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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="border border-border bg-black max-w-sm w-full mx-4 p-5">
        <div className="text-[10px] text-dim uppercase tracking-widest mb-3">Soutenir TV.QYRN</div>

        <p className="text-[12px] text-white leading-relaxed mb-2">
          On finance le serveur nous-memes pour rester{" "}
          <span className="text-on-air">sans pubs</span>. Toute aide est la bienvenue
          pour faire tourner la projection.
        </p>

        <p className="text-[11px] text-dim mb-5">
          Hebergement, bande passante, catalogue — tout coute. Meme 1 euro aide.
        </p>

        <div className="flex flex-col gap-2">
          <a
            href="https://ko-fi.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-on-air text-on-air text-[11px] uppercase tracking-wider text-center py-2 hover:bg-on-air hover:text-black transition-colors cursor-pointer"
          >
            faire un don
          </a>
          <button
            onClick={dismiss}
            className="text-[11px] text-dim uppercase tracking-wider py-2 hover:text-white cursor-pointer"
          >
            [ peut-etre plus tard ]
          </button>
        </div>
      </div>
    </div>
  );
}
