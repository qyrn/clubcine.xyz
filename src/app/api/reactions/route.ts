import { NextRequest, NextResponse, after } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const SLUG_REGEX = /^[a-z0-9-]{2,32}$/;
const BATCH_INTERVAL_MS = 150;
const MAX_BUFFER = 300;
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX = 60;

let buffer: string[] = [];
let pendingFlush: Promise<void> | null = null;
const rateLimitBuckets = new Map<string, { count: number; windowStart: number }>();

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets) {
    if (now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) rateLimitBuckets.delete(key);
  }
  const bucket = rateLimitBuckets.get(ip);
  if (!bucket) {
    rateLimitBuckets.set(ip, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

async function broadcast(slugs: string[]): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON || slugs.length === 0) return;
  try {
    await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_ANON,
        authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        messages: [
          { topic: "realtime:reactions", event: "reaction", payload: { slugs }, private: false },
        ],
      }),
    });
  } catch {}
}

function flushSoon(): Promise<void> {
  if (pendingFlush) return pendingFlush;
  pendingFlush = (async () => {
    await new Promise((resolve) => setTimeout(resolve, BATCH_INTERVAL_MS));
    const slugs = buffer;
    buffer = [];
    pendingFlush = null;
    await broadcast(slugs);
  })();
  return pendingFlush;
}

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let payload: { slugs?: unknown };
  try {
    payload = (await req.json()) as { slugs?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const slugs = Array.isArray(payload.slugs) ? payload.slugs : [];
  for (const slug of slugs) {
    if (buffer.length >= MAX_BUFFER) break;
    if (typeof slug === "string" && SLUG_REGEX.test(slug)) buffer.push(slug);
  }

  after(flushSoon);

  return NextResponse.json({ ok: true });
}
