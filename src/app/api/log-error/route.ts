import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ErrorPayload {
  source?: string;
  message?: string;
  stack?: string;
  url?: string;
  userId?: string | null;
  username?: string | null;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function clamp(s: string | undefined | null, max: number): string | null {
  if (!s) return null;
  const v = String(s).trim();
  if (!v) return null;
  return v.slice(0, max);
}

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let payload: ErrorPayload;
  try {
    payload = (await req.json()) as ErrorPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const message = clamp(payload.message, 1000);
  const source = clamp(payload.source, 80) ?? "client";
  if (!message) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const stack = clamp(payload.stack, 4000);
  const url = clamp(payload.url, 500);
  const userAgent = clamp(req.headers.get("user-agent"), 500);
  const userId = clamp(payload.userId, 64);
  const username = clamp(payload.username, 64);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false },
  });

  await supabase.from("error_log").insert({
    source,
    message,
    stack,
    url,
    user_agent: userAgent,
    user_id: userId,
    username,
  });

  return NextResponse.json({ ok: true });
}
