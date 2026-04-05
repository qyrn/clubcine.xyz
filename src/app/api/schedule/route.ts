import { NextResponse } from "next/server";
import { getCurrentSchedule } from "@/lib/schedule-engine";

export const dynamic = "force-dynamic";

export function GET() {
  const schedule = getCurrentSchedule();
  return NextResponse.json(schedule);
}
