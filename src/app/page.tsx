"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useWatchHeartbeat } from "@/lib/use-watch-heartbeat";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import Hero from "@/components/Hero";
import ScheduleGrid from "@/components/ScheduleGrid";
import SoireesGrid from "@/components/SoireesGrid";
import Suggestions from "@/components/Suggestions";
import Chat from "@/components/Chat";
import Classement from "@/components/Classement";
import SupportPopup from "@/components/SupportPopup";
import BugReportButton from "@/components/BugReportButton";

function PageContent() {
  const { username } = useAuth();
  useWatchHeartbeat(username);

  return (
    <div className="flex flex-col min-h-screen">
      <Ticker />
      <Nav />

      <main>
        <Hero />

        <ScheduleGrid />

        <SoireesGrid />

        <section className="grid grid-cols-[1.2fr_0.8fr_1fr] border-b border-line max-[900px]:grid-cols-1">
          <div className="border-r border-line max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:border-line min-h-[440px] flex flex-col">
            <Chat />
          </div>
          <div className="border-r border-line max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:border-line">
            <Classement />
          </div>
          <div id="suggestions" className="scroll-mt-24">
            <Suggestions />
          </div>
        </section>
      </main>

      <footer className="px-10 py-6 flex justify-between items-center font-mono font-medium text-[11px] tracking-[0.04em] text-ink-3 max-md:px-5 max-md:py-4 max-md:flex-col max-md:gap-2">
        <span>CLUBCINE.XYZ · CHANNEL 01 · 2026</span>
        <span className="flex gap-3">
          <a
            href="https://ko-fi.com/clubcinefr"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink transition-colors"
          >
            KO-FI
          </a>
          <span>·</span>
          <Link href="/about" className="hover:text-ink transition-colors">
            À PROPOS
          </Link>
          <span>·</span>
          <BugReportButton inline />
        </span>
      </footer>

      <SupportPopup />
    </div>
  );
}

export default function Home() {
  return <PageContent />;
}
