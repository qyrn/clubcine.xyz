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
                       check (role in ('spectateur', 'soutien', 'admin')),
  username_font_slug   text,
  username_color_slug  text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.profiles
  add column if not exists username_font_slug text,
  add column if not exists username_color_slug text,
  add column if not exists twitter text not null default '',
  add column if not exists instagram text not null default '';

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
returns trigger language plpgsql as $$
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
  uname := coalesce(new.raw_user_meta_data->>'username', 'spectateur_' || substr(new.id::text, 1, 8));
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
  coalesce(u.raw_user_meta_data->>'username', 'spectateur_' || substr(u.id::text, 1, 8)),
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

create index if not exists suggestions_kind_status_idx
  on public.suggestions (kind, status, created_at desc);
create index if not exists suggestions_user_id_idx
  on public.suggestions (user_id) where user_id is not null;

alter table public.suggestions enable row level security;

drop policy if exists "suggestions insert any" on public.suggestions;
create policy "suggestions insert any" on public.suggestions for insert with check (true);

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
  'lundi-matin', 'marathon-12h', 'marathon-24h', 'chatterbox', 'vhs'
);
delete from public.badges where slug in (
  'cinephile-100', 'polar-jp', 'nouvelle-vague', 'kubrickien',
  'lundi-matin', 'marathon-12h', 'marathon-24h', 'chatterbox', 'vhs'
);

-- Catalogue badges
insert into public.badges (slug, label, description, color) values
  ('supporter',            'Supporter',                'A soutenu la chaîne sur Ko-fi.',                          '#ff0033'),
  ('founding-viewer',      'Premier viewer',           'Présent dès l''ouverture de la chaîne.',                  '#ff0033'),
  ('night-owl',            'Noctambule',               'Connecté entre 02h et 06h.',                              '#ff0033'),
  ('top-10',               'Top 10',                   'A atteint le top 10 du classement.',                      '#ff0033'),
  ('curator',              'Programmateur',            'Une suggestion acceptée et programmée.',                  '#ff0033'),
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
create policy "bugs insert any" on public.bug_reports for insert with check (true);

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

-- 9c. Trigger chat
create or replace function public.award_chat_badges()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  msg_count int;
begin
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
