import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TIPEEE_API_KEY = Deno.env.get("TIPEEE_API_KEY")!;
const POLL_SECRET = Deno.env.get("TIPEEE_POLL_SECRET")!;

const TIPEEE_EVENTS_URL = "https://api.tipeeestream.com/v1.0/events.json";
const DONATION_BATCH_SIZE = 50;

interface TipeeeDonationEvent {
  ref?: string;
  id?: string | number;
  type?: string;
  user?: { username?: string };
  parameters?: {
    username?: string;
    amount?: number | string | { amount?: number | string };
  };
}

interface AttributionResult {
  ref: string;
  username: string;
  matched: boolean;
  awarded: boolean;
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

function bearerToken(req: Request): string {
  const header = req.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function extractEvents(body: unknown): TipeeeDonationEvent[] {
  if (Array.isArray(body)) return body as TipeeeDonationEvent[];
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const candidates = [
      record.events,
      (record.datas as Record<string, unknown> | undefined)?.items,
      record.data,
      record.items,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate as TipeeeDonationEvent[];
    }
  }
  return [];
}

function eventRef(event: TipeeeDonationEvent): string {
  if (event.ref) return event.ref;
  if (event.id !== undefined) return String(event.id);
  return "";
}

function donorUsername(event: TipeeeDonationEvent): string {
  return (event.user?.username ?? event.parameters?.username ?? "").trim();
}

function donationAmount(event: TipeeeDonationEvent): string {
  const raw = event.parameters?.amount;
  if (raw === undefined || raw === null) return "";
  if (typeof raw === "object") return String(raw.amount ?? "");
  return String(raw);
}

async function attributeSupporter(
  event: TipeeeDonationEvent,
): Promise<AttributionResult | null> {
  const ref = eventRef(event);
  const username = donorUsername(event);
  if (!ref || !username) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, role")
    .ilike("username", username)
    .maybeSingle();

  if (!profile) {
    return { ref, username, matched: false, awarded: false };
  }

  const { data: existingBadge } = await supabase
    .from("user_badges")
    .select("user_id")
    .eq("user_id", profile.user_id)
    .eq("badge_slug", "supporter")
    .maybeSingle();

  if (existingBadge) {
    return { ref, username, matched: true, awarded: false };
  }

  const reason = `tipeee ${donationAmount(event)} (ref ${ref})`;

  if (profile.role !== "admin") {
    await supabase
      .from("profiles")
      .update({ role: "soutien" })
      .eq("user_id", profile.user_id)
      .neq("role", "admin");
  }

  await supabase.from("user_badges").upsert(
    { user_id: profile.user_id, badge_slug: "supporter", awarded_reason: reason },
    { onConflict: "user_id,badge_slug" },
  );

  return { ref, username, matched: true, awarded: true };
}

serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!safeEqual(bearerToken(req), POLL_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const query = new URLSearchParams({
    apiKey: TIPEEE_API_KEY,
    limit: String(DONATION_BATCH_SIZE),
    order: "desc",
    sort: "createdAt",
  });
  query.append("type[]", "donation");

  let events: TipeeeDonationEvent[];
  try {
    const response = await fetch(`${TIPEEE_EVENTS_URL}?${query.toString()}`);
    if (!response.ok) {
      const detail = await response.text();
      console.error("[tipeee-poll] events fetch failed", response.status, detail);
      return new Response(`Tipeee API error: ${response.status}`, { status: 502 });
    }
    events = extractEvents(await response.json());
  } catch (err) {
    console.error("[tipeee-poll] events fetch threw", err);
    return new Response("Tipeee API unreachable", { status: 502 });
  }

  const results: AttributionResult[] = [];
  for (const event of events) {
    const result = await attributeSupporter(event);
    if (result) results.push(result);
  }

  const awarded = results.filter((r) => r.awarded);
  if (awarded.length > 0) {
    console.log("[tipeee-poll] awarded", awarded.map((r) => `${r.username} (${r.ref})`));
  }

  return new Response(
    JSON.stringify({
      ok: true,
      scanned: events.length,
      matched: results.filter((r) => r.matched).length,
      awarded: awarded.length,
    }),
    { headers: { "content-type": "application/json" }, status: 200 },
  );
});
