import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { t: Date.now() },
    { headers: { "cache-control": "no-store" } },
  );
}
