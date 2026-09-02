// Edge Function : ~15 min avant une soirée, envoie une notification web push à
// tous les navigateurs abonnés (table push_subscriptions). Déclenchée chaque
// minute par pg_cron -> pg_net -> cette fonction (cf. la migration
// 202609022000_push_notifications.sql et le README).
//
// DÉPLOIEMENT
//   supabase functions deploy soiree-push --no-verify-jwt
//   supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." PUSH_CRON_SECRET="..."
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sont injectés par Supabase)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const PUSH_CRON_SECRET = Deno.env.get("PUSH_CRON_SECRET")!;

webpush.setVapidDetails("mailto:contact@clubcine.xyz", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

interface SoireeRow {
  id: string;
  title: string;
  starts_at: string;
}

interface SubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (req.headers.get("x-cron-secret") !== PUSH_CRON_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const nowMs = Date.now();
  const { data: soirees } = await supabase
    .from("soiree_agenda")
    .select("id, title, starts_at")
    .eq("push_sent", false)
    .gt("starts_at", new Date(nowMs).toISOString())
    .lte("starts_at", new Date(nowMs + 20 * 60 * 1000).toISOString());

  const pending = (soirees ?? []) as SoireeRow[];
  if (pending.length === 0) {
    return new Response(JSON.stringify({ ok: true, soirees: 0 }), {
      headers: { "content-type": "application/json" },
    });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");
  const subscriptions = (subs ?? []) as SubRow[];

  let sent = 0;
  let pruned = 0;

  for (const s of pending) {
    const minutes = Math.max(
      1,
      Math.round((new Date(s.starts_at).getTime() - Date.now()) / 60000),
    );
    const payload = JSON.stringify({
      title: "Soirée clubcine",
      body: `« ${s.title} » commence dans ${minutes} min`,
      url: "/movie",
      tag: `soiree-${s.id}`,
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          pruned++;
        } else {
          console.error(
            "[soiree-push] send failed:",
            status,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }

    await supabase.from("soiree_agenda").update({ push_sent: true }).eq("id", s.id);
  }

  return new Response(
    JSON.stringify({ ok: true, soirees: pending.length, sent, pruned }),
    { headers: { "content-type": "application/json" } },
  );
});
