// Edge Function : reçoit un webhook Ko-fi, attribue badge `supporter` + role `soutien`
// au user dont le pseudo Ko-fi (or l'email) matche un username clubcine.
//
// DÉPLOIEMENT
//   supabase functions deploy kofi-webhook --no-verify-jwt
//   supabase secrets set KOFI_VERIFICATION_TOKEN="<token affiché côté ko-fi>"
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service role key>"   (déjà set par défaut)
//
// CONFIG KO-FI
//   ko-fi.com → settings → API → Webhook URL :
//     https://<project>.functions.supabase.co/kofi-webhook
//   Copie le verification_token et set-le dans la secret KOFI_VERIFICATION_TOKEN.
//
// PAYLOAD KO-FI (POST x-www-form-urlencoded, champ "data" = JSON)
//   {
//     verification_token: "...",
//     message_id: "uuid",
//     timestamp: "...",
//     type: "Donation" | "Subscription" | "Shop Order",
//     is_public: true,
//     from_name: "Pseudo Ko-fi",         // <- ce qu'on tente de matcher en username
//     message: "...",
//     amount: "5.00",
//     url: "...",
//     email: "...",                       // <- fallback si from_name ne matche pas
//     ...
//   }
//
// RÈGLE DE MATCH
//   1. Cherche profile.username = from_name (case-insensitive)
//   2. Sinon, cherche auth.users.email = email (besoin service role)
//   3. Sinon, log le webhook et n'attribue rien.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KOFI_TOKEN = Deno.env.get("KOFI_VERIFICATION_TOKEN")!;

interface KofiPayload {
  verification_token: string;
  message_id: string;
  type: string;
  from_name: string;
  email: string;
  amount: string;
  is_public: boolean;
  message?: string;
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

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: KofiPayload;
  try {
    const form = await req.formData();
    const raw = form.get("data");
    if (typeof raw !== "string") throw new Error("missing data field");
    payload = JSON.parse(raw) as KofiPayload;
  } catch (err) {
    return new Response(`Bad payload: ${err instanceof Error ? err.message : "unknown"}`, {
      status: 400,
    });
  }

  if (!safeEqual(payload.verification_token ?? "", KOFI_TOKEN)) {
    return new Response("Invalid token", { status: 401 });
  }

  const reason = `ko-fi ${payload.type} ${payload.amount} (msg ${payload.message_id})`;

  let userId: string | null = null;

  if (payload.from_name) {
    const { data: byName } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("username", payload.from_name)
      .maybeSingle();
    if (byName) userId = byName.user_id;
  }

  if (!userId && payload.email) {
    const { data: list } = await supabase.auth.admin.listUsers();
    const found = list?.users.find(
      (u) => u.email?.toLowerCase() === payload.email.toLowerCase()
    );
    if (found) userId = found.id;
  }

  if (!userId) {
    console.warn("[kofi] no match for", payload.from_name, payload.email);
    return new Response(
      JSON.stringify({ ok: true, matched: false, reason: "no user matched" }),
      { headers: { "content-type": "application/json" }, status: 200 }
    );
  }

  await supabase
    .from("profiles")
    .update({ role: "soutien" })
    .eq("user_id", userId)
    .neq("role", "admin");

  await supabase
    .from("user_badges")
    .upsert(
      { user_id: userId, badge_slug: "supporter", awarded_reason: reason },
      { onConflict: "user_id,badge_slug" }
    );

  return new Response(
    JSON.stringify({ ok: true, matched: true, user_id: userId }),
    { headers: { "content-type": "application/json" }, status: 200 }
  );
});
