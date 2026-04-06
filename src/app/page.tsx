"use client";

import { useState } from "react";
import Player from "@/components/Player";
import NowPlaying from "@/components/NowPlaying";
import Schedule from "@/components/Schedule";
import Chat from "@/components/Chat";
import ViewerCount from "@/components/ViewerCount";
import Ticker from "@/components/Ticker";
import SupportPopup from "@/components/SupportPopup";
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-[var(--font-ui)] text-warm tracking-wide">tv.qyrn</span>
        </div>
        <div className="flex items-center gap-4">
          <ViewerCount />
          <nav className="hidden sm:flex items-center gap-3 text-[11px] font-[var(--font-ui)]">
            <span className="text-warm/80 border border-border px-1.5 py-0.5 cursor-default">projection</span>
            <span className="text-muted hover:text-warm/60 cursor-pointer">programme</span>
            <span className="text-muted hover:text-warm/60 cursor-pointer">archives</span>
          </nav>
          <button
            onClick={() => setShowAuth(true)}
            className="text-[11px] font-[var(--font-ui)] text-muted hover:text-warm/60 cursor-pointer"
          >
            connexion
          </button>
        </div>
      </header>

      <Ticker />

      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 min-h-0 bg-black">
            <Player />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] shrink-0 border-t border-border">
            <NowPlaying />
            <Schedule />
          </div>
        </div>

        <aside className="w-full lg:w-[300px] lg:border-l border-t lg:border-t-0 border-border flex flex-col h-[280px] lg:h-auto shrink-0 lg:shrink">
          <Chat />
        </aside>
      </main>

      <footer className="px-4 py-1.5 border-t border-border shrink-0 flex items-center justify-between">
        <nav className="flex items-center gap-3 text-[10px] font-[var(--font-ui)] text-muted">
          <a href="https://ko-fi.com/qyrnsec" target="_blank" rel="noopener noreferrer" className="hover:text-warm/60 cursor-pointer">ko-fi</a>
        </nav>
        <span className="text-[10px] text-muted font-[var(--font-ui)]">2026</span>
      </footer>

      <SupportPopup />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
