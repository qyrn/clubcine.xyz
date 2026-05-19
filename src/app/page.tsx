import { getCurrentSchedule } from "@/lib/schedule-engine";
import HomeClient from "./home-client";

export const dynamic = "force-dynamic";

function buildInitialSchedule() {
  return { ...getCurrentSchedule(), serverTime: Date.now() };
}

export default function Home() {
  return <HomeClient initialSchedule={buildInitialSchedule()} />;
}
