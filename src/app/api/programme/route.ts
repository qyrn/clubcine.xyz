import { NextRequest, NextResponse } from "next/server";
import { getProgrammeForHours } from "@/lib/schedule-engine";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = Number(searchParams.get("hours") ?? 24);
  const hours = Number.isFinite(raw) ? Math.max(1, Math.min(72, raw)) : 24;
  const items = getProgrammeForHours(hours);
  return NextResponse.json({ items, serverTime: Date.now(), hours });
}
