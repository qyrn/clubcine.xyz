import { NextRequest, NextResponse, after } from "next/server";
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
const DISCORD_WEBHOOK = process.env.DISCORD_ERROR_WEBHOOK_URL ?? "";

const ALERT_TTL_MS = 5 * 60_000;
const recentAlerts = new Map<string, number>();

function clamp(s: string | undefined | null, max: number): string | null {
  if (!s) return null;
  const v = String(s).trim();
  if (!v) return null;
  return v.slice(0, max);
}

function shouldAlert(key: string): boolean {
  const now = Date.now();
  for (const [k, t] of recentAlerts) {
    if (now - t > ALERT_TTL_MS) recentAlerts.delete(k);
  }
  if (recentAlerts.has(key)) return false;
  recentAlerts.set(key, now);
  return true;
}

interface AlertInput {
  source: string;
  message: string;
  stack: string | null;
  url: string | null;
  username: string | null;
}

async function notifyDiscord(input: AlertInput): Promise<void> {
  const fields = [
    { name: "Message", value: input.message },
    { name: "Source", value: input.source, inline: true },
    { name: "Utilisateur", value: input.username ?? "anonyme", inline: true },
  ];
  if (input.url) fields.push({ name: "URL", value: input.url });

  const embed = {
    title: "Erreur runtime · clubcine.xyz",
    color: 0xff0033,
    description: input.stack ? "```\n" + input.stack.slice(0, 3900) + "\n```" : undefined,
    fields,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch {}
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

  if (DISCORD_WEBHOOK && shouldAlert(message)) {
    after(() => notifyDiscord({ source, message, stack, url, username }));
  }

  return NextResponse.json({ ok: true });
}
