import { NextResponse } from "next/server";
import { isSiteLocked } from "@/lib/launch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const locked = isSiteLocked();
  return NextResponse.json(
    {
      status: "ok",
      locked,
      timestamp: Date.now(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
