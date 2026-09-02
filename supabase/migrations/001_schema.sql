-- =============================================================================
-- clubcine.xyz · schema complet (consolidé)
-- =============================================================================
-- Tout en un seul fichier idempotent. Re-exécutable sans casser l'existant.
--
-- Sections :
--   1. profiles (table + RLS + triggers + backfill)
--   2. profile_top_films
--   3. suggestions
--   4. badges + user_badges (catalogue + RLS)
--   5. guestbook
--   6. follows
--   7. bug_reports
--   8. avatars (storage policies, bucket à créer manuellement)
--   9. tiers automatiques (viewing / chat / suggestions / bug-hunter)
--  10. backfills (badges paliers à partir des données existantes)
--  11. emotes (table + RLS + storage policies, bucket à créer manuellement)
--  12. cleanup auto des messages > 30j (pg_cron, daily 04:00 UTC)
--  13. security hardening (guard role, username case-insensitive, rate limits)
--  14. error_log (runtime observability)
--  15. notifications (follow + livre d'or + mention chat)
--  16. modération chat avancée (ban, slow mode, gel)
--
-- =============================================================================

-- =============================================================================
-- 1. profiles
-- =============================================================================

create table if not exists public.profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  username             text unique not null,
  bio                  text not null default '',
  letterboxd           text not null default '',
  avatar_url           text,
  role                 text not null default 'spectateur'
                       check (role in ('spectateur', 'soutien', 'moderateur', 'admin')),
  username_font_slug   text,
  username_color_slug  text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.profiles
  add column if not exists username_font_slug text,
  add column if not exists username_color_slug text,
  add column if not exists profile_accent_slug text,
  add column if not exists twitter text not null default '',
  add column if not exists instagram text not null default '';

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;
  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('spectateur', 'soutien', 'moderateur', 'admin'));
end $$;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_username_format;
  end if;
  alter table public.profiles
    add constraint profiles_username_format
    check (username ~ '^[A-Za-z0-9_-]{3,20}$') not valid;
end $$;

create index if not exists profiles_username_lower_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "profiles read all" on public.profiles;
create policy "profiles read all" on public.profiles for select using (true);

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self" on public.profiles for insert
  with check (auth.uid() = user_id);

create or replace function public.touch_profiles_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.touch_profiles_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text;
begin
  uname := trim(coalesce(new.raw_user_meta_data->>'username', ''));
  if uname !~ '^[A-Za-z0-9_-]{3,20}$' then
    uname := 'spectateur_' || substr(new.id::text, 1, 8);
  end if;
  insert into public.profiles (user_id, username)
  values (new.id, uname)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill profiles depuis les users existants
insert into public.profiles (user_id, username, bio, letterboxd, role)
select
  u.id,
  case
    when trim(coalesce(u.raw_user_meta_data->>'username', '')) ~ '^[A-Za-z0-9_-]{3,20}$'
      then trim(u.raw_user_meta_data->>'username')
    else 'spectateur_' || substr(u.id::text, 1, 8)
  end,
  coalesce(u.raw_user_meta_data->>'bio', ''),
  coalesce(u.raw_user_meta_data->>'letterboxd', ''),
  coalesce(u.raw_user_meta_data->>'role', 'spectateur')
from auth.users u
on conflict (user_id) do nothing;


-- =============================================================================
-- 2. profile_top_films
-- =============================================================================

create table if not exists public.profile_top_films (
  user_id      uuid not null references auth.users(id) on delete cascade,
  position     smallint not null check (position between 1 and 4),
  letterboxd   text not null,
  title        text not null,
  poster_url   text,
  font_slug    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, position)
);

alter table public.profile_top_films
  add column if not exists font_slug text;

create index if not exists profile_top_films_user_idx on public.profile_top_films (user_id);

alter table public.profile_top_films enable row level security;

drop policy if exists "top_films read all" on public.profile_top_films;
create policy "top_films read all" on public.profile_top_films for select using (true);

drop policy if exists "top_films insert self" on public.profile_top_films;
create policy "top_films insert self" on public.profile_top_films for insert
  with check (auth.uid() = user_id);

drop policy if exists "top_films update self" on public.profile_top_films;
create policy "top_films update self" on public.profile_top_films for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "top_films delete self" on public.profile_top_films;
create policy "top_films delete self" on public.profile_top_films for delete
  using (auth.uid() = user_id);

drop trigger if exists top_films_set_updated_at on public.profile_top_films;
create trigger top_films_set_updated_at
  before update on public.profile_top_films
  for each row execute function public.touch_profiles_updated_at();


-- =============================================================================
-- 3. suggestions
-- =============================================================================

create table if not exists public.suggestions (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('film', 'soiree')),
  user_id      uuid references auth.users(id) on delete set null,
  username     text,
  payload      jsonb not null,
  credit       boolean not null default false,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'rejected')),
  created_at   timestamptz not null default now()
);

alter table public.suggestions
  add column if not exists admin_note text;

create index if not exists suggestions_kind_status_idx
  on public.suggestions (kind, status, created_at desc);
create index if not exists suggestions_user_id_idx
  on public.suggestions (user_id) where user_id is not null;

alter table public.suggestions enable row level security;

drop policy if exists "suggestions insert any" on public.suggestions;
create policy "suggestions insert any" on public.suggestions for insert
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "suggestions select own" on public.suggestions;
create policy "suggestions select own" on public.suggestions for select
  using (auth.uid() = user_id);

drop policy if exists "suggestions select admin" on public.suggestions;
create policy "suggestions select admin" on public.suggestions for select
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));

drop policy if exists "suggestions update admin" on public.suggestions;
create policy "suggestions update admin" on public.suggestions for update
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));


-- =============================================================================
-- 4. badges + user_badges
-- =============================================================================

create table if not exists public.badges (
  slug         text primary key,
  label        text not null,
  description  text not null default '',
  icon         text,
  color        text not null default '#ff0033',
  created_at   timestamptz not null default now()
);

alter table public.badges enable row level security;

drop policy if exists "badges read all" on public.badges;
create policy "badges read all" on public.badges for select using (true);

drop policy if exists "badges write admin" on public.badges;
create policy "badges write admin" on public.badges for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));

create table if not exists public.user_badges (
  user_id         uuid not null references auth.users(id) on delete cascade,
  badge_slug      text not null references public.badges(slug) on delete cascade,
  awarded_at      timestamptz not null default now(),
  awarded_reason  text,
  primary key (user_id, badge_slug)
);

create index if not exists user_badges_user_idx on public.user_badges (user_id);
create index if not exists user_badges_badge_idx on public.user_badges (badge_slug);

alter table public.user_badges enable row level security;

drop policy if exists "user_badges read all" on public.user_badges;
create policy "user_badges read all" on public.user_badges for select using (true);

drop policy if exists "user_badges write admin" on public.user_badges;
create policy "user_badges write admin" on public.user_badges for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));

-- Cleanup des badges périmés
delete from public.user_badges where badge_slug in (
  'cinephile-100', 'polar-jp', 'nouvelle-vague', 'kubrickien',
  'lundi-matin', 'marathon-12h', 'marathon-24h', 'chatterbox', 'vhs', 'curator'
);
delete from public.badges where slug in (
  'cinephile-100', 'polar-jp', 'nouvelle-vague', 'kubrickien',
  'lundi-matin', 'marathon-12h', 'marathon-24h', 'chatterbox', 'vhs', 'curator'
);

-- Catalogue badges
insert into public.badges (slug, label, description, color) values
  ('supporter',            'Supporter',                'A soutenu la chaîne sur Ko-fi.',                          '#ff0033'),
  ('founding-viewer',      'Premier viewer',           'Présent dès l''ouverture de la chaîne.',                  '#ff0033'),
  ('night-owl',            'Noctambule',               'Connecté entre 02h et 06h.',                              '#ff0033'),
  ('top-10',               'Top 10',                   'A atteint le top 10 du classement.',                      '#ff0033'),
  ('admin',                'Admin',                    'Membre de l''équipe technique.',                          '#ff0033'),
  ('viewer-habitue',       'Habitué',                  '1h+ d''antenne cumulée.',                                 '#ff0033'),
  ('viewer-cinephile',     'Cinéphile',                '10h+ d''antenne cumulée.',                                '#ff0033'),
  ('viewer-connaisseur',   'Connaisseur',              '50h+ d''antenne cumulée.',                                '#ff0033'),
  ('viewer-cingle',        'Cinglé',                   '200h+ d''antenne cumulée.',                               '#ff0033'),
  ('viewer-legende',       'Légende',                  '500h+ d''antenne cumulée.',                               '#ff0033'),
  ('chatter-bavard',       'Bavard',                   '10+ messages dans le chat.',                              '#ff0033'),
  ('chatter-animateur',    'Animateur',                '50+ messages dans le chat.',                              '#ff0033'),
  ('chatter-voix',         'Voix',                     '200+ messages dans le chat.',                             '#ff0033'),
  ('film-suggest-1',       'Premier film proposé',     'A envoyé sa première suggestion de film.',                '#ff0033'),
  ('film-suggest-5',       'Habitué des suggestions',  'A envoyé 5 suggestions de films.',                        '#ff0033'),
  ('film-suggest-10',      'Critique amateur',         'A envoyé 10 suggestions de films.',                       '#ff0033'),
  ('soiree-suggest-1',     'Première soirée proposée', 'A envoyé sa première suggestion de soirée.',              '#ff0033'),
  ('soiree-suggest-5',     'Animateur de soirées',     'A envoyé 5 suggestions de soirées.',                      '#ff0033'),
  ('soiree-suggest-10',    'Programmateur en chef',    'A envoyé 10 suggestions de soirées.',                     '#ff0033'),
  ('soiree-jouee',         'Soirée jouée',             'Une soirée suggérée est passée à l''antenne.',            '#ff0033'),
  ('bug-hunter',           'Bug hunter',               'A signalé un bug accepté par l''équipe.',                 '#ff0033')
on conflict (slug) do update set
  label = excluded.label,
  description = excluded.description,
  color = excluded.color;


-- =============================================================================
-- 5. guestbook
-- =============================================================================

create table if not exists public.guestbook (
  id                uuid primary key default gen_random_uuid(),
  profile_user_id   uuid not null references auth.users(id) on delete cascade,
  author_user_id    uuid not null references auth.users(id) on delete cascade,
  author_username   text not null,
  message           text not null check (length(message) between 1 and 280),
  created_at        timestamptz not null default now()
);

create index if not exists guestbook_profile_idx
  on public.guestbook (profile_user_id, created_at desc);
create index if not exists guestbook_author_idx on public.guestbook (author_user_id);

alter table public.guestbook enable row level security;

drop policy if exists "guestbook read all" on public.guestbook;
create policy "guestbook read all" on public.guestbook for select using (true);

drop policy if exists "guestbook insert auth" on public.guestbook;
create policy "guestbook insert auth" on public.guestbook for insert
  with check (auth.uid() = author_user_id);

drop policy if exists "guestbook delete owner or recipient" on public.guestbook;
create policy "guestbook delete owner or recipient" on public.guestbook for delete
  using (auth.uid() = author_user_id or auth.uid() = profile_user_id);


-- =============================================================================
-- 6. follows
-- =============================================================================

create table if not exists public.follows (
  follower_id   uuid not null references auth.users(id) on delete cascade,
  following_id  uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists follows_follower_idx on public.follows (follower_id);

alter table public.follows enable row level security;

drop policy if exists "follows read all" on public.follows;
create policy "follows read all" on public.follows for select using (true);

drop policy if exists "follows insert self" on public.follows;
create policy "follows insert self" on public.follows for insert
  with check (auth.uid() = follower_id and follower_id <> following_id);

drop policy if exists "follows delete self" on public.follows;
create policy "follows delete self" on public.follows for delete
  using (auth.uid() = follower_id);


-- =============================================================================
-- 7. bug_reports
-- =============================================================================

create table if not exists public.bug_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  username     text,
  message      text not null check (length(message) between 1 and 1000),
  page_url     text,
  user_agent   text,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'rejected')),
  created_at   timestamptz not null default now()
);

create index if not exists bug_reports_status_idx
  on public.bug_reports (status, created_at desc);

alter table public.bug_reports enable row level security;

drop policy if exists "bugs insert any" on public.bug_reports;
create policy "bugs insert any" on public.bug_reports for insert
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "bugs select own" on public.bug_reports;
create policy "bugs select own" on public.bug_reports for select using (auth.uid() = user_id);

drop policy if exists "bugs select admin" on public.bug_reports;
create policy "bugs select admin" on public.bug_reports for select
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));

drop policy if exists "bugs update admin" on public.bug_reports;
create policy "bugs update admin" on public.bug_reports for update
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));


-- =============================================================================
-- 8. avatars (Storage)
-- =============================================================================
-- Le bucket "avatars" doit être créé MANUELLEMENT depuis le dashboard Supabase
-- (Storage > New bucket) AVANT d'exécuter ce bloc :
--   - name: avatars
--   - public: true
--   - file size limit: 1 MB
--   - allowed mime types: image/jpeg, image/png, image/webp
-- Convention de chemin : avatars/{user_id}/avatar.<ext>

drop policy if exists "avatars read all" on storage.objects;
create policy "avatars read all" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars insert own" on storage.objects;
create policy "avatars insert own" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Posters de suggestions de soirée (bucket à créer manuellement : public, ~2 Mo,
-- jpeg/png/webp). Upload réservé aux comptes connectés dans leur propre dossier
-- (les anonymes peuvent suggérer une soirée sans poster perso).
-- Convention de chemin : suggestion-posters/{user_id}/{uuid}.<ext>
drop policy if exists "suggestion-posters read all" on storage.objects;
create policy "suggestion-posters read all" on storage.objects for select
  using (bucket_id = 'suggestion-posters');

drop policy if exists "suggestion-posters insert own" on storage.objects;
create policy "suggestion-posters insert own" on storage.objects for insert
  with check (
    bucket_id = 'suggestion-posters'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "suggestion-posters delete own or admin" on storage.objects;
create policy "suggestion-posters delete own or admin" on storage.objects for delete
  using (
    bucket_id = 'suggestion-posters'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
    )
  );


-- =============================================================================
-- 9. tiers automatiques (triggers)
-- =============================================================================

-- 9a. Helper réutilisable : attribuer les badges viewer pour un user/seconds donné
create or replace function public.award_viewer_badges_for(p_username text, p_seconds int)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  select user_id into uid from public.profiles
  where lower(username) = lower(p_username) limit 1;
  if uid is null then return; end if;

  if p_seconds >= 1 * 3600 then
    insert into public.user_badges (user_id, badge_slug, awarded_reason)
    values (uid, 'viewer-habitue', '1h+ d''antenne')
    on conflict (user_id, badge_slug) do nothing;
  end if;
  if p_seconds >= 10 * 3600 then
    insert into public.user_badges (user_id, badge_slug, awarded_reason)
    values (uid, 'viewer-cinephile', '10h+ d''antenne')
    on conflict (user_id, badge_slug) do nothing;
  end if;
  if p_seconds >= 50 * 3600 then
    insert into public.user_badges (user_id, badge_slug, awarded_reason)
    values (uid, 'viewer-connaisseur', '50h+ d''antenne')
    on conflict (user_id, badge_slug) do nothing;
  end if;
  if p_seconds >= 200 * 3600 then
    insert into public.user_badges (user_id, badge_slug, awarded_reason)
    values (uid, 'viewer-cingle', '200h+ d''antenne')
    on conflict (user_id, badge_slug) do nothing;
  end if;
  if p_seconds >= 500 * 3600 then
    insert into public.user_badges (user_id, badge_slug, awarded_reason)
    values (uid, 'viewer-legende', '500h+ d''antenne')
    on conflict (user_id, badge_slug) do nothing;
  end if;
end;
$$;

-- 9b. Trigger viewing
create or replace function public.award_viewer_badges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.award_viewer_badges_for(NEW.username, NEW.seconds);
  return NEW;
end;
$$;

drop trigger if exists watch_time_award_badges on public.watch_time;
create trigger watch_time_award_badges
  after insert or update on public.watch_time
  for each row execute function public.award_viewer_badges();

-- 9b-bis. RPC d'incrément du temps de visionnage. La table watch_time est en
-- écriture seule via cette RPC (aucune policy write). L'identité est dérivée du
-- compte connecté (auth.uid()), jamais du paramètre p_username, sinon n'importe
-- qui pourrait gonfler le score d'autrui. Les visiteurs anonymes ne comptent
-- pas (return early) et p_seconds est borné pour empêcher la falsification.
create or replace function public.increment_watch_time(p_username text, p_seconds integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  caller_username text;
  safe_seconds integer;
begin
  if auth.uid() is null then
    return;
  end if;
  select username into caller_username
    from public.profiles where user_id = auth.uid();
  if caller_username is null then
    return;
  end if;
  safe_seconds := least(greatest(coalesce(p_seconds, 0), 0), 120);
  if safe_seconds = 0 then
    return;
  end if;
  insert into public.watch_time (username, seconds, updated_at)
  values (caller_username, safe_seconds, now())
  on conflict (username) do update
    set seconds = public.watch_time.seconds + safe_seconds,
        updated_at = now();
end;
$$;

revoke all on function public.increment_watch_time(text, integer) from public;
revoke all on function public.increment_watch_time(text, integer) from anon;
grant execute on function public.increment_watch_time(text, integer) to authenticated;

-- Nettoyage des lignes watch_time orphelines (pseudo sans profil réel : anciens
-- enregistrements anonymes laissés avant le durcissement de increment_watch_time).
-- Idempotent, sans effet une fois la table propre.
delete from public.watch_time wt
where not exists (
  select 1 from public.profiles p
  where lower(p.username) = lower(wt.username)
);

-- 9c. Trigger chat
create or replace function public.award_chat_badges()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  msg_count int;
begin
  if NEW.kind = 'system' then return NEW; end if;

  select user_id into uid from public.profiles
  where lower(username) = lower(NEW.username) limit 1;
  if uid is null then return NEW; end if;

  select count(*) into msg_count from public.messages
  where lower(username) = lower(NEW.username);

  if msg_count >= 10 then
    insert into public.user_badges (user_id, badge_slug, awarded_reason)
    values (uid, 'chatter-bavard', '10+ messages')
    on conflict (user_id, badge_slug) do nothing;
  end if;
  if msg_count >= 50 then
    insert into public.user_badges (user_id, badge_slug, awarded_reason)
    values (uid, 'chatter-animateur', '50+ messages')
    on conflict (user_id, badge_slug) do nothing;
  end if;
  if msg_count >= 200 then
    insert into public.user_badges (user_id, badge_slug, awarded_reason)
    values (uid, 'chatter-voix', '200+ messages')
    on conflict (user_id, badge_slug) do nothing;
  end if;
  return NEW;
end;
$$;

drop trigger if exists messages_award_badges on public.messages;
create trigger messages_award_badges
  after insert on public.messages
  for each row execute function public.award_chat_badges();

-- 9d. Trigger suggestions (paliers 1/5/10 par kind)
create or replace function public.award_suggestion_badges()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cnt int;
  prefix text;
begin
  if NEW.user_id is null then return NEW; end if;

  prefix := case NEW.kind
    when 'film'   then 'film-suggest'
    when 'soiree' then 'soiree-suggest'
  end;
  if prefix is null then return NEW; end if;

  select count(*) into cnt from public.suggestions
  where user_id = NEW.user_id and kind = NEW.kind;

  if cnt >= 1 then
    insert into public.user_badges (user_id, badge_slug, awarded_reason)
    values (NEW.user_id, prefix || '-1', '1ère suggestion ' || NEW.kind)
    on conflict (user_id, badge_slug) do nothing;
  end if;
  if cnt >= 5 then
    insert into public.user_badges (user_id, badge_slug, awarded_reason)
    values (NEW.user_id, prefix || '-5', '5e suggestion ' || NEW.kind)
    on conflict (user_id, badge_slug) do nothing;
  end if;
  if cnt >= 10 then
    insert into public.user_badges (user_id, badge_slug, awarded_reason)
    values (NEW.user_id, prefix || '-10', '10e suggestion ' || NEW.kind)
    on conflict (user_id, badge_slug) do nothing;
  end if;
  return NEW;
end;
$$;

drop trigger if exists suggestions_award_badges on public.suggestions;
create trigger suggestions_award_badges
  after insert on public.suggestions
  for each row execute function public.award_suggestion_badges();

-- 9e. Trigger bug-hunter (badge auto à l'acceptation)
create or replace function public.award_bug_hunter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status = 'accepted' and (OLD.status is null or OLD.status <> 'accepted')
     and NEW.user_id is not null then
    insert into public.user_badges (user_id, badge_slug, awarded_reason)
    values (NEW.user_id, 'bug-hunter', 'bug accepté #' || substr(NEW.id::text, 1, 8))
    on conflict (user_id, badge_slug) do nothing;
  end if;
  return NEW;
end;
$$;

drop trigger if exists bug_reports_award_hunter on public.bug_reports;
create trigger bug_reports_award_hunter
  after update on public.bug_reports
  for each row execute function public.award_bug_hunter();


-- =============================================================================
-- 10. Backfills (rattrapage des badges sur l'existant)
-- =============================================================================

-- 10a. Viewing badges
do $$
declare r record;
begin
  for r in select username, seconds from public.watch_time loop
    perform public.award_viewer_badges_for(r.username, r.seconds);
  end loop;
end $$;

-- 10b. Chat badges
do $$
declare r record;
begin
  for r in select username, count(*) as c from public.messages group by username loop
    if r.c >= 10 then
      insert into public.user_badges (user_id, badge_slug, awarded_reason)
      select p.user_id, 'chatter-bavard', 'backfill'
      from public.profiles p where lower(p.username) = lower(r.username)
      on conflict do nothing;
    end if;
    if r.c >= 50 then
      insert into public.user_badges (user_id, badge_slug, awarded_reason)
      select p.user_id, 'chatter-animateur', 'backfill'
      from public.profiles p where lower(p.username) = lower(r.username)
      on conflict do nothing;
    end if;
    if r.c >= 200 then
      insert into public.user_badges (user_id, badge_slug, awarded_reason)
      select p.user_id, 'chatter-voix', 'backfill'
      from public.profiles p where lower(p.username) = lower(r.username)
      on conflict do nothing;
    end if;
  end loop;
end $$;

-- 10c. Suggestions badges
do $$
declare r record;
begin
  for r in
    select user_id, kind, count(*) as c
    from public.suggestions
    where user_id is not null
    group by user_id, kind
  loop
    if r.c >= 1 then
      insert into public.user_badges (user_id, badge_slug, awarded_reason)
      values (r.user_id, r.kind || '-suggest-1', 'backfill') on conflict do nothing;
    end if;
    if r.c >= 5 then
      insert into public.user_badges (user_id, badge_slug, awarded_reason)
      values (r.user_id, r.kind || '-suggest-5', 'backfill') on conflict do nothing;
    end if;
    if r.c >= 10 then
      insert into public.user_badges (user_id, badge_slug, awarded_reason)
      values (r.user_id, r.kind || '-suggest-10', 'backfill') on conflict do nothing;
    end if;
  end loop;
end $$;


-- =============================================================================
-- 11. emotes (table + RLS + storage policies)
-- =============================================================================
-- Catalogue d'emotes uploadées par les admins et les soutiens, parsées dans
-- les messages du chat sous la forme `:slug:`.
--
-- Le bucket Storage "emotes" doit être créé MANUELLEMENT depuis le dashboard
-- Supabase AVANT d'exécuter ce bloc :
--   - name: emotes
--   - public: true
--   - file size limit: 1 MB
--   - allowed mime types: image/png, image/webp, image/gif
-- Convention de chemin : emotes/{user_id}/{slug}.<ext>

create table if not exists public.emotes (
  slug          text primary key
                check (slug ~ '^[a-z0-9-]{2,32}$'),
  label         text not null default '',
  image_url     text not null,
  image_path    text not null,
  uploader_id   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists emotes_created_at_idx on public.emotes (created_at desc);
create index if not exists emotes_uploader_idx on public.emotes (uploader_id);

alter table public.emotes enable row level security;

drop policy if exists "emotes read all" on public.emotes;
create policy "emotes read all" on public.emotes for select using (true);

drop policy if exists "emotes insert admin or soutien" on public.emotes;
create policy "emotes insert admin or soutien" on public.emotes for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('admin', 'soutien')
    )
    and auth.uid() = uploader_id
  );

drop policy if exists "emotes delete admin or owner" on public.emotes;
create policy "emotes delete admin or owner" on public.emotes for delete
  using (
    auth.uid() = uploader_id
    or exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "emotes storage read all" on storage.objects;
create policy "emotes storage read all" on storage.objects for select
  using (bucket_id = 'emotes');

drop policy if exists "emotes storage insert admin or soutien" on storage.objects;
create policy "emotes storage insert admin or soutien" on storage.objects for insert
  with check (
    bucket_id = 'emotes'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('admin', 'soutien')
    )
  );

drop policy if exists "emotes storage delete admin or owner" on storage.objects;
create policy "emotes storage delete admin or owner" on storage.objects for delete
  using (
    bucket_id = 'emotes'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.profiles p
        where p.user_id = auth.uid() and p.role = 'admin'
      )
    )
  );

-- =============================================================================
-- 12. cleanup auto des messages > 30j (pg_cron, daily 04:00 UTC)
-- =============================================================================
-- `messages.timestamp` est stocké en epoch millis (Date.now() côté client).
-- Le job tourne tous les jours à 04:00 UTC et purge les lignes > 30 jours.
-- Idempotent : on tue le job existant avant de le replanifier.

create extension if not exists pg_cron;

create or replace function public.cleanup_old_messages()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.messages
  where timestamp < (extract(epoch from now() - interval '30 days') * 1000)::bigint;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-old-messages') then
    perform cron.unschedule('cleanup-old-messages');
  end if;
  perform cron.schedule(
    'cleanup-old-messages',
    '0 4 * * *',
    $cron$ select public.cleanup_old_messages(); $cron$
  );
end $$;

-- =============================================================================
-- 12bis. modération chat (delete admin OU modérateur)
-- =============================================================================
-- La table `public.messages` est préexistante (créée hors migrations). On garde
-- son schéma intact, on ajoute juste une policy delete pour la modération.
-- Realtime DELETE doit aussi être activé côté Supabase pour propager la suppression.

drop policy if exists "messages delete admin or moderator" on public.messages;
create policy "messages delete admin or moderator" on public.messages for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('admin', 'moderateur')
    )
  );

-- Realtime DELETE payload.old.id requiert replica identity full
alter table public.messages replica identity full;

-- =============================================================================
-- 12bis-b. messages : notifications système (dons Ko-fi)
-- =============================================================================
-- L'Edge Function kofi-webhook (rôle JWT service_role) insère une ligne
-- kind = 'system' à chaque don ponctuel : le chat affiche
-- « <pseudo> vient de soutenir la chaîne ». Les clients anon / authenticated
-- ne peuvent écrire que kind = 'user' : enforce_chat_moderation force la valeur
-- pour tout appelant qui n'est pas service_role.

alter table public.messages
  add column if not exists kind text not null default 'user';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'messages_kind_check') then
    alter table public.messages
      add constraint messages_kind_check check (kind in ('user', 'system'));
  end if;
end $$;

-- =============================================================================
-- 12ter. staff_applications (candidatures pour rejoindre l'équipe)
-- =============================================================================
-- Un user connecté peut postuler pour devenir modérateur. L'admin accepte
-- depuis /admin/staff : statut → 'accepted' + promotion manuelle via le bouton
-- (deux appels SQL séparés côté client, pas de trigger auto).

create table if not exists public.staff_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  username      text not null,
  role_wanted   text not null default 'moderateur'
                check (role_wanted in ('moderateur')),
  motivation    text not null check (length(motivation) between 30 and 1500),
  status        text not null default 'pending'
                check (status in ('pending', 'accepted', 'rejected')),
  created_at    timestamptz not null default now()
);

create index if not exists staff_applications_status_idx
  on public.staff_applications (status, created_at desc);
create index if not exists staff_applications_user_idx
  on public.staff_applications (user_id);

alter table public.staff_applications enable row level security;

drop policy if exists "staff insert auth" on public.staff_applications;
create policy "staff insert auth" on public.staff_applications for insert
  with check (auth.uid() = user_id);

drop policy if exists "staff select own" on public.staff_applications;
create policy "staff select own" on public.staff_applications for select
  using (auth.uid() = user_id);

drop policy if exists "staff select admin" on public.staff_applications;
create policy "staff select admin" on public.staff_applications for select
  using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "staff update admin" on public.staff_applications;
create policy "staff update admin" on public.staff_applications for update
  using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
  );

-- Rate limit : 1 candidature pending max par user (et 1 candidature / 7j si déjà refusée)
create or replace function public.rate_limit_staff_applications()
returns trigger language plpgsql set search_path = public as $$
declare
  pending_count int;
  recent_count int;
begin
  select count(*) into pending_count
  from public.staff_applications
  where user_id = new.user_id and status = 'pending';
  if pending_count >= 1 then
    raise exception 'tu as déjà une candidature en attente';
  end if;

  select count(*) into recent_count
  from public.staff_applications
  where user_id = new.user_id
    and created_at > now() - interval '7 days';
  if recent_count >= 1 then
    raise exception 'attends 7 jours entre deux candidatures';
  end if;
  return new;
end;
$$;

drop trigger if exists staff_applications_rate_limit on public.staff_applications;
create trigger staff_applications_rate_limit
  before insert on public.staff_applications
  for each row execute function public.rate_limit_staff_applications();

-- =============================================================================
-- 13. security hardening
-- =============================================================================
-- a) guard role change : un user ne peut pas se promouvoir admin via update self.
-- b) username case-insensitive unique : empêche "lynch" / "Lynch" coexistence.
-- c) rate limits applicatifs sur messages / suggestions / bug_reports.

-- a) guard role change (auth.uid() IS NULL = bypass owner SQL Editor / service_role)
create or replace function public.guard_profiles_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_admin boolean;
begin
  if new.role is distinct from old.role then
    if auth.uid() is null then
      return new;
    end if;
    select exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    ) into is_admin;
    if not is_admin then
      raise exception 'role change requires admin privilege';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update of role on public.profiles
  for each row execute function public.guard_profiles_role_change();

-- a-ter) guard personnalisation pseudo : couleur / police du pseudo et accent du
-- profil réservés aux soutiens (contrepartie des dons Ko-fi). Le retour aux
-- valeurs par défaut reste autorisé à tous. auth.uid() IS NULL = bypass owner
-- SQL Editor / service_role.
create or replace function public.guard_profiles_cosmetics_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_privileged boolean;
  sets_custom boolean;
begin
  sets_custom :=
    (new.username_font_slug is distinct from old.username_font_slug
      and coalesce(new.username_font_slug, 'default') <> 'default')
    or (new.username_color_slug is distinct from old.username_color_slug
      and coalesce(new.username_color_slug, 'default') <> 'default')
    or (new.profile_accent_slug is distinct from old.profile_accent_slug
      and coalesce(new.profile_accent_slug, 'red') <> 'red');

  if not sets_custom then
    return new;
  end if;
  if auth.uid() is null then
    return new;
  end if;
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('soutien', 'moderateur', 'admin')
  ) into is_privileged;
  if not is_privileged then
    raise exception 'personnalisation du pseudo réservée aux soutiens';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_cosmetics on public.profiles;
create trigger profiles_guard_cosmetics
  before update of username_font_slug, username_color_slug, profile_accent_slug on public.profiles
  for each row execute function public.guard_profiles_cosmetics_change();

-- a-bis) RPC de promotion de rôle réservée admin. La seule policy update sur
-- profiles est "update self", donc un admin ne peut pas changer le rôle d'autrui
-- via un update direct (0 ligne, faux succès côté client). Cette RPC security
-- definer vérifie le rôle de l'appelant et lève une erreur explicite sinon.
create or replace function public.admin_set_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare
  is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  ) into is_admin;
  if not is_admin then
    raise exception 'admin privilege required';
  end if;
  if p_role not in ('spectateur', 'soutien', 'moderateur', 'admin') then
    raise exception 'invalid role: %', p_role;
  end if;
  update public.profiles set role = p_role where user_id = p_user_id;
end;
$$;

revoke all on function public.admin_set_role(uuid, text) from public;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- Suppression d'un compte (admin only). Supprime auth.users (cascade profiles,
-- follows, guestbook, etc. via FK on delete) puis purge watch_time / messages
-- indexés par username. Auto-suppression interdite.
create or replace function public.admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  is_admin boolean;
  target_username text;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  ) into is_admin;
  if not is_admin then
    raise exception 'admin privilege required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot delete your own account';
  end if;
  select username into target_username from public.profiles where user_id = p_user_id;
  if target_username is not null then
    delete from public.watch_time where lower(username) = lower(target_username);
    delete from public.messages where lower(username) = lower(target_username);
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- b) username case-insensitive uniqueness
-- Le `unique` column-level reste mais on ajoute un index unique sur lower().
-- Échoue si la table contient déjà des doublons à la casse (le user les nettoie
-- manuellement avant ré-exécution).
create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

-- c) rate limit messages : 10 inserts max par username sur les 10 dernières secondes.
-- Dépassement = pause anti-spam de 60s posée dans chat_timeouts (sauf staff), que
-- enforce_chat_moderation fait respecter pour les inserts suivants.
create or replace function public.rate_limit_messages()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recent_count int;
  is_staff boolean := false;
begin
  if (auth.jwt() ->> 'role') = 'service_role' then return new; end if;

  select count(*) into recent_count
  from public.messages
  where username = new.username
    and timestamp > (extract(epoch from now() - interval '10 seconds') * 1000)::bigint;
  if recent_count >= 10 then
    if auth.uid() is not null then
      select role in ('admin', 'moderateur') into is_staff
        from public.profiles where user_id = auth.uid();
    end if;
    if not coalesce(is_staff, false) then
      insert into public.chat_timeouts (username, until)
        values (new.username, now() + interval '60 seconds')
        on conflict (username) do update set until = excluded.until;
      raise exception 'trop de messages, pause de 60 secondes';
    end if;
    raise exception 'trop de messages, ralentis un peu';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.rate_limit_messages();

-- c) rate limit suggestions : 5 inserts max par user_id (ou username si anon) / heure
create or replace function public.rate_limit_suggestions()
returns trigger language plpgsql set search_path = public as $$
declare
  recent_count int;
begin
  if new.user_id is not null then
    select count(*) into recent_count
    from public.suggestions
    where user_id = new.user_id
      and created_at > now() - interval '1 hour';
  else
    select count(*) into recent_count
    from public.suggestions
    where username = new.username
      and created_at > now() - interval '1 hour';
  end if;
  if recent_count >= 5 then
    raise exception 'trop de suggestions sur la dernière heure, réessaie plus tard';
  end if;
  return new;
end;
$$;

drop trigger if exists suggestions_rate_limit on public.suggestions;
create trigger suggestions_rate_limit
  before insert on public.suggestions
  for each row execute function public.rate_limit_suggestions();

-- c) rate limit bug_reports : 5 inserts max par user_id (ou username si anon) / heure
create or replace function public.rate_limit_bug_reports()
returns trigger language plpgsql set search_path = public as $$
declare
  recent_count int;
begin
  if new.user_id is not null then
    select count(*) into recent_count
    from public.bug_reports
    where user_id = new.user_id
      and created_at > now() - interval '1 hour';
  else
    select count(*) into recent_count
    from public.bug_reports
    where username = new.username
      and created_at > now() - interval '1 hour';
  end if;
  if recent_count >= 5 then
    raise exception 'trop de signalements sur la dernière heure, réessaie plus tard';
  end if;
  return new;
end;
$$;

drop trigger if exists bug_reports_rate_limit on public.bug_reports;
create trigger bug_reports_rate_limit
  before insert on public.bug_reports
  for each row execute function public.rate_limit_bug_reports();

-- =============================================================================
-- 14. ERROR LOG (runtime observability)
-- =============================================================================

create table if not exists public.error_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  message text not null,
  stack text,
  url text,
  user_agent text,
  user_id uuid references auth.users(id) on delete set null,
  username text
);

create index if not exists error_log_created_at_idx on public.error_log (created_at desc);

alter table public.error_log enable row level security;

drop policy if exists "error_log insert any" on public.error_log;
create policy "error_log insert any" on public.error_log for insert
  with check (true);

drop policy if exists "error_log select admin" on public.error_log;
create policy "error_log select admin" on public.error_log for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- rate limit : 30 erreurs max / 10 minutes par user_id (ou username si anon)
create or replace function public.rate_limit_error_log()
returns trigger language plpgsql set search_path = public as $$
declare
  recent_count int;
begin
  if new.user_id is not null then
    select count(*) into recent_count
    from public.error_log
    where user_id = new.user_id
      and created_at > now() - interval '10 minutes';
  elsif new.username is not null then
    select count(*) into recent_count
    from public.error_log
    where username = new.username
      and created_at > now() - interval '10 minutes';
  else
    return new;
  end if;
  if recent_count >= 30 then
    raise exception 'rate limited';
  end if;
  return new;
end;
$$;

drop trigger if exists error_log_rate_limit on public.error_log;
create trigger error_log_rate_limit
  before insert on public.error_log
  for each row execute function public.rate_limit_error_log();

-- =============================================================================
-- 15. notifications (follow + livre d'or)
-- =============================================================================
-- Un user connecté est notifié quand quelqu'un le suit ou signe son livre d'or.
-- Les lignes sont créées UNIQUEMENT par les triggers security definer sur
-- `follows` et `guestbook` : le client n'insère jamais ici (aucune policy
-- insert), donc impossible de fabriquer de fausses notifications.
-- Realtime INSERT propage la cloche en direct. Cleanup auto > 60 jours.

create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  recipient_id    uuid not null references auth.users(id) on delete cascade,
  actor_id        uuid references auth.users(id) on delete cascade,
  actor_username  text not null,
  type            text not null check (type in ('follow', 'guestbook', 'mention', 'role', 'suggestion_accepted', 'suggestion_rejected', 'badge')),
  detail          text,
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table public.notifications
  add column if not exists detail text;

-- type check étendu (idempotent : drop + re-add pour les installs antérieures)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'notifications_type_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications drop constraint notifications_type_check;
  end if;
  alter table public.notifications
    add constraint notifications_type_check
    check (type in ('follow', 'guestbook', 'mention', 'role', 'suggestion_accepted', 'suggestion_rejected', 'badge'));
end $$;

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_id) where read = false;

alter table public.notifications enable row level security;

drop policy if exists "notifications select own" on public.notifications;
create policy "notifications select own" on public.notifications for select
  using (auth.uid() = recipient_id);

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications for update
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

drop policy if exists "notifications delete own" on public.notifications;
create policy "notifications delete own" on public.notifications for delete
  using (auth.uid() = recipient_id);

create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor_name text;
begin
  select username into actor_name from public.profiles
  where user_id = new.follower_id;
  insert into public.notifications (recipient_id, actor_id, actor_username, type)
  values (new.following_id, new.follower_id, coalesce(actor_name, 'spectateur'), 'follow');
  return new;
end;
$$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();

create or replace function public.notify_on_guestbook()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.author_user_id <> new.profile_user_id then
    insert into public.notifications (recipient_id, actor_id, actor_username, type)
    values (new.profile_user_id, new.author_user_id, new.author_username, 'guestbook');
  end if;
  return new;
end;
$$;

drop trigger if exists guestbook_notify on public.guestbook;
create trigger guestbook_notify
  after insert on public.guestbook
  for each row execute function public.notify_on_guestbook();

-- Mentions `@pseudo` dans le chat : une notif par profil mentionné (auto-mention
-- exclue). L'auteur peut être anonyme (actor_id null, actor_username = pseudo).
create or replace function public.notify_on_mention()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sender_id uuid;
  rec record;
begin
  if new.kind = 'system' then return new; end if;

  select user_id into sender_id from public.profiles
  where lower(username) = lower(new.username) limit 1;

  for rec in
    select distinct lower(parts[1]) as uname
    from regexp_matches(coalesce(new.text, ''), '@([A-Za-z0-9_]{2,20})', 'g') as m(parts)
  loop
    insert into public.notifications (recipient_id, actor_id, actor_username, type)
    select p.user_id, sender_id, new.username, 'mention'
    from public.profiles p
    where lower(p.username) = rec.uname
      and p.user_id is distinct from sender_id;
  end loop;
  return new;
end;
$$;

drop trigger if exists messages_notify_mention on public.messages;
create trigger messages_notify_mention
  after insert on public.messages
  for each row execute function public.notify_on_mention();

-- Changement de rôle : notif au membre concerné. detail = slug du nouveau rôle.
create or replace function public.notify_on_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    insert into public.notifications (recipient_id, actor_id, actor_username, type, detail)
    values (new.user_id, null, 'clubcine', 'role', new.role);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_notify_role on public.profiles;
create trigger profiles_notify_role
  after update of role on public.profiles
  for each row execute function public.notify_on_role_change();

-- Suggestion traitée (acceptée / refusée) : notif à l'auteur si connu.
-- detail = titre de la suggestion (payload->>'title').
create or replace function public.notify_on_suggestion_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  title text;
begin
  if new.status is distinct from old.status
     and new.status in ('accepted', 'rejected')
     and new.user_id is not null then
    title := coalesce(nullif(new.payload->>'title', ''), 'ta suggestion');
    insert into public.notifications (recipient_id, actor_id, actor_username, type, detail)
    values (
      new.user_id,
      null,
      'clubcine',
      case when new.status = 'accepted' then 'suggestion_accepted' else 'suggestion_rejected' end,
      title
    );
  end if;
  return new;
end;
$$;

drop trigger if exists suggestions_notify_status on public.suggestions;
create trigger suggestions_notify_status
  after update of status on public.suggestions
  for each row execute function public.notify_on_suggestion_status();

-- Badge débloqué : notif au membre. detail = libellé du badge.
create or replace function public.notify_on_badge()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  badge_label text;
begin
  select label into badge_label from public.badges where slug = new.badge_slug;
  insert into public.notifications (recipient_id, actor_id, actor_username, type, detail)
  values (new.user_id, null, 'clubcine', 'badge', coalesce(badge_label, new.badge_slug));
  return new;
end;
$$;

drop trigger if exists user_badges_notify on public.user_badges;
create trigger user_badges_notify
  after insert on public.user_badges
  for each row execute function public.notify_on_badge();

-- Realtime INSERT (idempotent : on n'ajoute la table à la publication qu'une fois)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- Realtime emotes (catalogue live, sans F5) et profiles (rôle / pseudo / avatar
-- mis à jour en direct dans le chat). Idempotent.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'emotes'
    ) then
      alter publication supabase_realtime add table public.emotes;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
    ) then
      alter publication supabase_realtime add table public.profiles;
    end if;
  end if;
end $$;

-- Cleanup auto des notifications > 60 jours (pg_cron, daily 04:15 UTC)
create or replace function public.cleanup_old_notifications()
returns void language sql security definer set search_path = public as $$
  delete from public.notifications where created_at < now() - interval '60 days';
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-old-notifications') then
    perform cron.unschedule('cleanup-old-notifications');
  end if;
  perform cron.schedule(
    'cleanup-old-notifications',
    '15 4 * * *',
    $cron$ select public.cleanup_old_notifications(); $cron$
  );
end $$;

-- Cleanup auto des error_log > 30 jours (pg_cron, daily 04:30 UTC). La table
-- grossit sans limite sinon (un insert par erreur runtime client).
create or replace function public.cleanup_old_error_logs()
returns void language sql security definer set search_path = public as $$
  delete from public.error_log where created_at < now() - interval '30 days';
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-old-error-logs') then
    perform cron.unschedule('cleanup-old-error-logs');
  end if;
  perform cron.schedule(
    'cleanup-old-error-logs',
    '30 4 * * *',
    $cron$ select public.cleanup_old_error_logs(); $cron$
  );
end $$;

-- =============================================================================
-- 16. modération chat avancée (ban comptes, slow mode global, gel chat)
-- =============================================================================
-- Trois leviers anti-raid pour le chat live :
--   1. ban / timeout par compte connecté (colonnes sur profiles, lié à user_id)
--   2. slow mode global (N secondes minimum entre deux messages d'un username)
--   3. gel du chat en lecture seule
--
-- Les pseudos anonymes restent contournables par régénération localStorage :
-- le ban nominatif ne vaut que pour les comptes (auth.uid() stable). Le slow
-- mode et le gel s'appliquent à tout le monde (filtrage par username pour le
-- slow mode, identique au rate limit existant).
--
-- Admin/modérateur bypass tous les checks (peuvent toujours parler, même chat gelé).
-- Mutations exposées via RPC security definer pour éviter d'élargir les RLS.

create table if not exists public.chat_settings (
  id                  int primary key default 1 check (id = 1),
  frozen              boolean not null default false,
  slow_mode_seconds   int not null default 0
                      check (slow_mode_seconds between 0 and 300),
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users(id) on delete set null
);

insert into public.chat_settings (id) values (1) on conflict (id) do nothing;

alter table public.chat_settings enable row level security;

drop policy if exists "chat_settings read all" on public.chat_settings;
create policy "chat_settings read all" on public.chat_settings for select using (true);

-- Pauses anti-spam temporaires, posées par rate_limit_messages quand un username
-- dépasse le rate limit. Clé = username (couvre comptes connectés ET anonymes).
-- Écriture uniquement via triggers security definer ; lecture publique pour l'UI.
create table if not exists public.chat_timeouts (
  username  text primary key,
  until     timestamptz not null
);

alter table public.chat_timeouts enable row level security;

drop policy if exists "chat_timeouts read all" on public.chat_timeouts;
create policy "chat_timeouts read all" on public.chat_timeouts for select using (true);

alter table public.profiles
  add column if not exists chat_banned_until timestamptz,
  add column if not exists chat_ban_reason   text;

create index if not exists profiles_chat_banned_until_idx
  on public.profiles (chat_banned_until)
  where chat_banned_until is not null;

-- Guard : seuls admin/modérateur peuvent toucher aux colonnes ban d'un profile.
-- auth.uid() IS NULL = bypass pour les RPC security definer et le SQL Editor.
create or replace function public.guard_profiles_chat_ban_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_staff boolean;
begin
  if (new.chat_banned_until is distinct from old.chat_banned_until)
     or (new.chat_ban_reason is distinct from old.chat_ban_reason) then
    if auth.uid() is null then
      return new;
    end if;
    select exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'moderateur')
    ) into is_staff;
    if not is_staff then
      raise exception 'chat ban change requires admin or moderator privilege';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_chat_ban on public.profiles;
create trigger profiles_guard_chat_ban
  before update of chat_banned_until, chat_ban_reason on public.profiles
  for each row execute function public.guard_profiles_chat_ban_change();

-- Enforce : tourne avant chaque insert sur messages.
-- Ordre alphabétique des triggers PG : "messages_enforce_moderation" passe
-- avant "messages_rate_limit" (déjà en place), ce qui colle bien.
create or replace function public.enforce_chat_moderation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_staff           boolean := false;
  caller_banned      timestamptz;
  caller_username    text;
  settings_frozen    boolean;
  settings_slow      int;
  threshold_ms       bigint;
  recent_msg_ts      bigint;
  spam_until         timestamptz;
begin
  if (auth.jwt() ->> 'role') = 'service_role' then
    return new;
  end if;
  new.kind := 'user';

  select frozen, slow_mode_seconds
    into settings_frozen, settings_slow
    from public.chat_settings where id = 1;

  -- anti-usurpation : un compte connecté poste forcément sous son propre pseudo,
  -- jamais sous un username arbitraire fourni par le client.
  if auth.uid() is not null then
    select role in ('admin', 'moderateur'), chat_banned_until, username
      into is_staff, caller_banned, caller_username
      from public.profiles
      where user_id = auth.uid();
    if caller_username is not null then
      new.username := caller_username;
    end if;
  end if;

  if is_staff then
    return new;
  end if;

  select until into spam_until
    from public.chat_timeouts where username = new.username;
  if spam_until is not null and spam_until > now() then
    raise exception 'tu spammes, pause % secondes',
      greatest(1, ceil(extract(epoch from (spam_until - now())))::int);
  end if;

  if caller_banned is not null and caller_banned > now() then
    raise exception 'tu es banni du chat jusqu''au %',
      to_char(caller_banned at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI');
  end if;

  if coalesce(settings_frozen, false) then
    raise exception 'chat figé par la modération';
  end if;

  if coalesce(settings_slow, 0) > 0 then
    threshold_ms := (extract(epoch from now()) * 1000)::bigint
                  - (settings_slow * 1000);
    select max(timestamp) into recent_msg_ts
      from public.messages
     where username = new.username
       and timestamp > threshold_ms;
    if recent_msg_ts is not null then
      raise exception 'slow mode actif, attends % secondes entre tes messages', settings_slow;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_enforce_moderation on public.messages;
create trigger messages_enforce_moderation
  before insert on public.messages
  for each row execute function public.enforce_chat_moderation();

-- RPC : mise à jour gel + slow mode (admin OU modérateur).
create or replace function public.chat_set_settings(
  p_frozen            boolean,
  p_slow_mode_seconds int
) returns void language plpgsql security definer set search_path = public as $$
declare
  is_staff boolean;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('admin', 'moderateur')
  ) into is_staff;
  if not is_staff then
    raise exception 'admin or moderator required';
  end if;

  if p_slow_mode_seconds < 0 or p_slow_mode_seconds > 300 then
    raise exception 'slow_mode_seconds must be between 0 and 300';
  end if;

  update public.chat_settings
     set frozen            = coalesce(p_frozen, frozen),
         slow_mode_seconds = coalesce(p_slow_mode_seconds, slow_mode_seconds),
         updated_at        = now(),
         updated_by        = auth.uid()
   where id = 1;
end;
$$;

revoke all on function public.chat_set_settings(boolean, int) from public;
grant execute on function public.chat_set_settings(boolean, int) to authenticated;

-- RPC : ban / unban d'un compte. p_until null = lever le ban.
-- Admin peut tout, modérateur peut ban spectateur/soutien/modérateur (pas admin).
create or replace function public.chat_ban_user(
  p_user_id uuid,
  p_until   timestamptz,
  p_reason  text
) returns void language plpgsql security definer set search_path = public as $$
declare
  caller_role text;
  target_role text;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot ban yourself';
  end if;
  select role into caller_role from public.profiles where user_id = auth.uid();
  if caller_role not in ('admin', 'moderateur') then
    raise exception 'admin or moderator required';
  end if;
  select role into target_role from public.profiles where user_id = p_user_id;
  if target_role is null then
    raise exception 'target profile not found';
  end if;
  if caller_role = 'moderateur' and target_role = 'admin' then
    raise exception 'moderator cannot ban admin';
  end if;

  update public.profiles
     set chat_banned_until = p_until,
         chat_ban_reason   = case when p_until is null then null else p_reason end
   where user_id = p_user_id;
end;
$$;

revoke all on function public.chat_ban_user(uuid, timestamptz, text) from public;
grant execute on function public.chat_ban_user(uuid, timestamptz, text) to authenticated;

-- Realtime UPDATE sur chat_settings (un seul row, pas d'INSERT après le seed).
alter table public.chat_settings replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'chat_settings'
     ) then
    alter publication supabase_realtime add table public.chat_settings;
  end if;
end $$;
