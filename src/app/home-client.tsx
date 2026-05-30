"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import { useWatchHeartbeat } from "@/lib/use-watch-heartbeat";
import { ScheduleProvider } from "@/lib/schedule-context";
import { ScheduleState } from "@/types";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import Hero from "@/components/Hero";
import ScheduleGrid from "@/components/ScheduleGrid";
import SoireesGrid from "@/components/SoireesGrid";
import Suggestions from "@/components/Suggestions";
import Chat from "@/components/Chat";
import Classement from "@/components/Classement";
import Footer from "@/components/Footer";

const SupportPopup = dynamic(() => import("@/components/SupportPopup"), { ssr: false });

interface Props {
  initialSchedule: ScheduleState;
}

export default function HomeClient({ initialSchedule }: Props) {
  const { username } = useAuth();
  useWatchHeartbeat(username);

  return (
    <ScheduleProvider initialSchedule={initialSchedule}>
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

        <Footer />

        <SupportPopup />
      </div>
    </ScheduleProvider>
  );
}
