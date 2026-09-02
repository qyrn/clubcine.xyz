-- =============================================================================
-- Web push : rappel avant chaque soirée
-- =============================================================================
-- Les navigateurs qui ont opté in enregistrent leur PushSubscription dans
-- push_subscriptions. ~15 min avant chaque soirée, l'Edge Function soiree-push
-- (déclenchée par pg_cron via pg_net) envoie une notification web à tous les
-- abonnés. Voir supabase/functions/soiree-push/README.md.

create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  p256dh      text not null,
  auth        text not null,
  user_id     uuid references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Un navigateur enregistre / met à jour / retire son propre abonnement. Les
-- endpoints sont des URLs opaques, longues et non énumérables ; les abonnements
-- invalides sont purgés côté envoi (réponse 404/410 du service de push). Pas de
-- policy select : seul le service_role (Edge Function) lit la table.
drop policy if exists "push_subscriptions insert" on public.push_subscriptions;
create policy "push_subscriptions insert" on public.push_subscriptions
  for insert with check (true);

drop policy if exists "push_subscriptions update" on public.push_subscriptions;
create policy "push_subscriptions update" on public.push_subscriptions
  for update using (true) with check (true);

drop policy if exists "push_subscriptions delete" on public.push_subscriptions;
create policy "push_subscriptions delete" on public.push_subscriptions
  for delete using (true);

-- soiree_agenda : flag d'envoi du rappel push (indépendant de `announced`, qui
-- concerne l'annonce dans le chat au démarrage).
alter table public.soiree_agenda
  add column if not exists push_sent boolean not null default false;

-- =============================================================================
-- Déclenchement : pg_cron -> pg_net -> Edge Function soiree-push
-- =============================================================================
-- Prérequis (à faire une fois, cf. README de la fonction) :
--   select vault.create_secret('https://<ref>.functions.supabase.co/soiree-push', 'soiree_push_url');
--   select vault.create_secret('<PUSH_CRON_SECRET>', 'soiree_push_secret');

create extension if not exists pg_net;

create or replace function public.trigger_soiree_push()
returns void language plpgsql security definer set search_path = public, vault as $$
declare
  fn_url  text;
  secret  text;
begin
  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'soiree_push_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'soiree_push_secret';
  if fn_url is null or secret is null then
    return;
  end if;
  if not exists (
    select 1 from public.soiree_agenda
    where push_sent = false
      and starts_at > now()
      and starts_at <= now() + interval '20 minutes'
  ) then
    return;
  end if;
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body := '{}'::jsonb
  );
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'soiree-push') then
    perform cron.unschedule('soiree-push');
  end if;
  perform cron.schedule(
    'soiree-push',
    '* * * * *',
    $cron$ select public.trigger_soiree_push(); $cron$
  );
end $$;
