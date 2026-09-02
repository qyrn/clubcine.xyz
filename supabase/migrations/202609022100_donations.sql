-- =============================================================================
-- donations : historique des dons Ko-fi (alimente le compteur de /soutiens)
-- =============================================================================
-- Une ligne par don ponctuel reçu, insérée par l'Edge Function kofi-webhook.
-- `message_id` (uuid Ko-fi) est unique : rejoue de webhook = pas de doublon.
-- La page /soutiens n'affiche qu'un compteur (nombre de dons), jamais les
-- montants ; `amount` est stocké pour usage admin.

create table if not exists public.donations (
  id          uuid primary key default gen_random_uuid(),
  message_id  text unique,
  amount      numeric,
  currency    text,
  is_public   boolean not null default false,
  from_name   text,
  created_at  timestamptz not null default now()
);

create index if not exists donations_created_at_idx on public.donations (created_at desc);

alter table public.donations enable row level security;

drop policy if exists "donations read all" on public.donations;
create policy "donations read all" on public.donations for select using (true);
-- écriture : service_role uniquement (Edge Function). Pas de policy insert.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'donations'
     ) then
    alter publication supabase_realtime add table public.donations;
  end if;
end $$;
