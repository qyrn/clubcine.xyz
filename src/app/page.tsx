"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Player from "@/components/Player";
import NowPlaying from "@/components/NowPlaying";
import Schedule from "@/components/Schedule";
import Classement from "@/components/Classement";
import Chat from "@/components/Chat";
import ViewerCount from "@/components/ViewerCount";
import Ticker from "@/components/Ticker";
import SupportPopup from "@/components/SupportPopup";
import AuthModal from "@/components/AuthModal";

function PageContent() {
  const { user, username, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <span className="font-[var(--font-title)] text-warm text-xl tracking-wide">
          tv<span className="inline-block animate-[pulse-dot_4s_ease-in-out_infinite]">.</span>qyrn
        </span>

        <div className="flex items-center gap-5">
          <ViewerCount />
          <nav className="hidden sm:flex items-center gap-4 text-[12px]">
            <span className="text-warm cursor-default">projection</span>
            <a href="#programme" className="text-muted hover:text-warm/70 cursor-pointer transition-colors">programme</a>
            <a href="#classement" className="text-muted hover:text-warm/70 cursor-pointer transition-colors">archives</a>
          </nav>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-warm/70">{username}</span>
              <button
                onClick={() => signOut()}
                className="text-[11px] text-dim hover:text-warm/70 cursor-pointer transition-colors"
              >
                déconnexion
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="text-[12px] text-muted hover:text-warm/70 cursor-pointer transition-colors"
            >
              connexion
            </button>
          )}
        </div>
      </header>

      <Ticker />

      <div className="relative w-full aspect-video max-h-[65vh] bg-black border-b border-border">
        <Player />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)",
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none" style={{
          background: "linear-gradient(to top, #080808, transparent)",
        }} />
      </div>

      <NowPlaying />

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_0.8fr] border-t border-border">
        <div id="programme" className="border-b lg:border-b-0 lg:border-r border-border scroll-mt-12">
          <Schedule />
        </div>
        <div className="border-b lg:border-b-0 lg:border-r border-border flex flex-col h-[400px] lg:h-[500px]">
          <Chat />
        </div>
        <div id="classement" className="scroll-mt-12">
          <Classement />
        </div>
      </main>

      <footer className="px-5 py-3 border-t border-border shrink-0 flex items-center justify-between">
        <nav className="flex items-center gap-4 text-[11px] text-dim">
          <a href="https://ko-fi.com/qyrnsec" target="_blank" rel="noopener noreferrer" className="hover:text-warm/70 cursor-pointer transition-colors">ko-fi</a>
        </nav>
        <span className="text-[11px] text-dim font-[var(--font-title)] italic">&copy; 2026 tv.qyrn</span>
      </footer>

      <SupportPopup />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <PageContent />
    </AuthProvider>
  );
}
