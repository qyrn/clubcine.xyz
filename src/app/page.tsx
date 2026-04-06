"use client";

import { useState } from "react";
import Player from "@/components/Player";
import NowPlaying from "@/components/NowPlaying";
import Schedule from "@/components/Schedule";
import Classement from "@/components/Classement";
import Chat from "@/components/Chat";
import ViewerCount from "@/components/ViewerCount";
import Ticker from "@/components/Ticker";
import SupportPopup from "@/components/SupportPopup";
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-[var(--font-ui)] text-warm tracking-wide">tv.qyrn</span>
        </div>
        <div className="flex items-center gap-4">
          <ViewerCount />
          <nav className="hidden sm:flex items-center gap-3 text-[11px] font-[var(--font-ui)]">
            <span className="text-warm/80 border border-border px-1.5 py-0.5 cursor-default">[projection]</span>
            <span className="text-muted hover:text-warm/60 cursor-pointer">[programme]</span>
            <span className="text-muted hover:text-warm/60 cursor-pointer">[archives]</span>
          </nav>
          <button
            onClick={() => setShowAuth(true)}
            className="text-[11px] font-[var(--font-ui)] text-muted hover:text-warm/60 cursor-pointer"
          >
            [connexion]
          </button>
        </div>
      </header>

      <Ticker />

      <div className="w-full aspect-video max-h-[65vh] bg-black border-b border-border">
        <Player />
      </div>

      <NowPlaying />

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] border-t border-border">
        <div className="border-b lg:border-b-0 lg:border-r border-border">
          <Schedule />
        </div>
        <div className="border-b lg:border-b-0 lg:border-r border-border flex flex-col h-[400px] lg:h-[500px]">
          <Chat />
        </div>
        <div>
          <Classement />
        </div>
      </main>

      <footer className="px-4 py-2 border-t border-border shrink-0 flex items-center justify-between">
        <nav className="flex items-center gap-4 text-[10px] font-[var(--font-ui)] text-muted uppercase tracking-wide">
          <a href="https://ko-fi.com/qyrnsec" target="_blank" rel="noopener noreferrer" className="hover:text-warm/60 cursor-pointer">[ko-fi]</a>
        </nav>
        <span className="text-[10px] text-muted font-[var(--font-ui)]">&copy; 2026 tv.qyrn</span>
      </footer>

      <SupportPopup />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
