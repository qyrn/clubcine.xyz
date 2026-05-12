import { getCurrentSchedule } from "@/lib/schedule-engine";
import HomeClient from "./home-client";

export const dynamic = "force-dynamic";

export default function Home() {
  const schedule = getCurrentSchedule();
  return <HomeClient initialSchedule={schedule} />;
}
