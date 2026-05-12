"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import { useWatchHeartbeat } from "@/lib/use-watch-heartbeat";
import { ScheduleState } from "@/types";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import Hero from "@/components/Hero";
import ScheduleGrid from "@/components/ScheduleGrid";
import SoireesGrid from "@/components/SoireesGrid";

const Chat = dynamic(() => import("@/components/Chat"), { ssr: false });
const Classement = dynamic(() => import("@/components/Classement"), { ssr: false });
const Suggestions = dynamic(() => import("@/components/Suggestions"), { ssr: false });
const SupportPopup = dynamic(() => import("@/components/SupportPopup"), { ssr: false });
const BugReportButton = dynamic(() => import("@/components/BugReportButton"), { ssr: false });

interface Props {
  initialSchedule: ScheduleState;
}

export default function HomeClient({ initialSchedule }: Props) {
  const { username } = useAuth();
  useWatchHeartbeat(username);

  return (
    <div className="flex flex-col min-h-screen">
      <Ticker />
      <Nav />

      <main>
        <Hero initialSchedule={initialSchedule} />

        <ScheduleGrid initialSchedule={initialSchedule} />

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
