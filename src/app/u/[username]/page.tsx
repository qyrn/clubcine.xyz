"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { UserProfile, useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import TopFilms from "@/components/TopFilms";
import AvatarUpload from "@/components/AvatarUpload";
import BadgeList from "@/components/BadgeList";
import Guestbook from "@/components/Guestbook";
import FollowButton, { useFollowStats } from "@/components/FollowButton";
import FollowListModal from "@/components/FollowListModal";
import { RoleBadge } from "@/components/RoleBadge";
import {
  normalizeLetterboxdProfile,
  letterboxdProfileHandle,
} from "@/lib/letterboxd";
import { useEscapeKey } from "@/lib/use-escape-key";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { fontStack, findColor } from "@/lib/fonts";
import FontPicker from "@/components/FontPicker";
import ColorPicker from "@/components/ColorPicker";

interface ProfileStats {
  rank: number | null;
  watchSeconds: number;
  messages: number;
  suggestions: number;
}

interface ProfileRow {
  user_id: string;
  username: string;
  bio: string;
  letterboxd: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
  username_font_slug: string | null;
  username_color_slug: string | null;
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    userId: row.user_id,
    username: row.username,
    bio: row.bio ?? "",
    letterboxd: row.letterboxd ?? "",
    avatarUrl: row.avatar_url,
    role: row.role ?? "spectateur",
    usernameFontSlug: row.username_font_slug,
    usernameColorSlug: row.username_color_slug,
  };
}

function formatWatch(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m}m`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function ProfileAvatar({ username, src }: { username: string; src: string | null }) {
  if (src) {
    return (
      <div className="w-[140px] h-[140px] rounded-md overflow-hidden border border-red bg-bg shrink-0 max-md:w-[110px] max-md:h-[110px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={username} className="w-full h-full object-cover" />
      </div>
    );
  }
  const letter = username.trim().slice(0, 2).toUpperCase() || "?";
  return (
    <div
      className="w-[140px] h-[140px] rounded-md border border-red flex items-center justify-center bg-bg shrink-0 max-md:w-[110px] max-md:h-[110px] relative overflow-hidden"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,0.02) 2px 3px)",
      }}
    >
      <span
        className="text-ink-3 leading-none select-none font-bold tracking-[-0.04em]"
        style={{ fontSize: "clamp(40px, 6vw, 56px)" }}
      >
        {letter}
      </span>
    </div>
  );
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 border-l border-line first:border-l-0 max-md:border-l-0 max-md:border-t max-md:first:border-t-0">
      <div
        className="font-bold leading-none tracking-[-0.02em] text-ink"
        style={{ fontSize: "clamp(24px, 3vw, 36px)" }}
      >
        {value}
      </div>
      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
        {label}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-4">
      <span className="font-mono text-[10px] tracking-[0.16em] uppercase font-bold text-red">
        [ {title} ]
      </span>
      <div className="flex-1 border-b border-line" />
    </div>
  );
}

function BioBlock({
  profile,
  isMe,
  onEditClick,
}: {
  profile: UserProfile;
  isMe: boolean;
  onEditClick: () => void;
}) {
  const handle = profile.letterboxd ? letterboxdProfileHandle(profile.letterboxd) : "";
  return (
    <div className="border border-dashed border-line-2 rounded-md p-4 flex flex-col gap-3 text-center">
      {profile.bio ? (
        <p className="text-[13px] leading-[1.6] text-ink-2">{profile.bio}</p>
      ) : (
        <p className="text-[13px] text-ink-3 italic">Aucune bio définie.</p>
      )}
      {profile.letterboxd && (
        <a
          href={profile.letterboxd}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 font-mono text-[10px] tracking-[0.08em] uppercase text-ink-3 hover:text-red transition-colors mx-auto"
        >
          <span aria-hidden>★</span>
          letterboxd / {handle || "qui"}
        </a>
      )}
      {!profile.bio && isMe && (
        <button
          type="button"
          onClick={onEditClick}
          className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-3 hover:text-red transition-colors cursor-pointer"
        >
          + ajouter
        </button>
      )}
    </div>
  );
}

function ProfileEditModal({
  profile,
  onClose,
}: {
  profile: UserProfile;
  onClose: () => void;
}) {
  const { updateProfile } = useAuth();
  useEscapeKey(onClose);
  useBodyScrollLock(true);
  const [bio, setBio] = useState(profile.bio);
  const [letterboxd, setLetterboxd] = useState(letterboxdProfileHandle(profile.letterboxd));
  const [usernameFontSlug, setUsernameFontSlug] = useState<string>(
    profile.usernameFontSlug ?? "marker"
  );
  const [usernameColorSlug, setUsernameColorSlug] = useState<string>(
    profile.usernameColorSlug ?? "default"
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErr(null);
    try {
      const result = await updateProfile({
        bio: bio.trim(),
        letterboxd: letterboxd.trim() ? normalizeLetterboxdProfile(letterboxd) : "",
        usernameFontSlug:
          usernameFontSlug === "marker" || usernameFontSlug === "default"
            ? null
            : usernameFontSlug,
        usernameColorSlug: usernameColorSlug === "default" ? null : usernameColorSlug,
      });
      if (result) {
        setErr(result);
        return;
      }
      onClose();
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 py-6"
      onClick={onClose}
    >
      <form
        onSubmit={save}
        className="border border-line bg-bg max-w-md w-full max-h-[90vh] flex flex-col rounded-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0 bg-bg">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-red">
            [ Modifier le profil ]
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-3 hover:text-ink text-[12px] cursor-pointer transition-colors"
          >
            fermer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            <ProfileAvatar username={profile.username} src={profile.avatarUrl} />
            <AvatarUpload profile={profile} />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
              Bio
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="Quelques mots sur toi…"
              className="bg-transparent border border-line-2 px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink rounded-md resize-none"
            />
            <span className="font-mono text-[10px] tracking-[0.04em] text-ink-4 self-end">
              {bio.length}/200
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
              Letterboxd
            </span>
            <div className="flex items-stretch border border-line-2 focus-within:border-ink rounded-md overflow-hidden bg-transparent">
              <span className="px-3 flex items-center font-mono text-[12px] text-ink-4 bg-line/40 select-none whitespace-nowrap">
                letterboxd.com/
              </span>
              <input
                type="text"
                value={letterboxd}
                onChange={(e) => setLetterboxd(e.target.value)}
                placeholder="ton-pseudo"
                className="flex-1 bg-transparent px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 outline-none"
              />
            </div>
          </label>

          <div className="border-t border-line pt-4 flex flex-col gap-4">
            <ColorPicker
              value={usernameColorSlug}
              onChange={setUsernameColorSlug}
              label="Couleur du pseudo"
            />
            <FontPicker
              value={usernameFontSlug}
              onChange={setUsernameFontSlug}
              preview={profile.username}
              label="Police du pseudo"
            />
          </div>

          {err && (
            <div className="font-mono text-[11px] text-red border border-red/30 px-3 py-2 rounded-md">
              ✕ {err}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-line shrink-0 bg-bg">
          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2.5 border border-ink text-ink font-semibold text-[12px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30 rounded-md"
          >
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileContent({ usernameParam }: { usernameParam: string }) {
  const { user, username: meUsername, profile: myProfile } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [target, setTarget] = useState<UserProfile | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [followList, setFollowList] = useState<"followers" | "following" | null>(null);

  const targetUsername = decodeURIComponent(usernameParam);
  const isMe = meUsername === targetUsername;
  const view = isMe ? myProfile ?? target : target;

  const followStats = useFollowStats(view?.userId ?? null, isMe);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setNotFound(false);

      const { data: profileRow } = await supabase
        .from("profiles")
        .select(
          "user_id,username,bio,letterboxd,avatar_url,role,created_at,username_font_slug,username_color_slug"
        )
        .ilike("username", targetUsername)
        .maybeSingle();

      if (cancelled) return;

      if (!profileRow) {
        setTarget(null);
        setCreatedAt(null);
        setNotFound(true);
        setStats(null);
        setLoading(false);
        return;
      }

      const row = profileRow as ProfileRow;
      setTarget(rowToProfile(row));
      setCreatedAt(row.created_at);

      const [{ data: rows }, { count: msgCount }, { count: sugCount }] = await Promise.all([
        supabase
          .from("watch_time")
          .select("username,seconds")
          .order("seconds", { ascending: false }),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .ilike("username", row.username),
        supabase
          .from("suggestions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", row.user_id),
      ]);
      if (cancelled) return;

      const list = (rows ?? []) as { username: string; seconds: number }[];
      const idx = list.findIndex(
        (r) => r.username.toLowerCase() === row.username.toLowerCase()
      );

      setStats({
        rank: idx === -1 ? null : idx + 1,
        watchSeconds: idx === -1 ? 0 : list[idx].seconds ?? 0,
        messages: msgCount ?? 0,
        suggestions: sugCount ?? 0,
      });
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [targetUsername]);

  const role = view?.role ?? "spectateur";
  const displayUsername = view?.username ?? targetUsername;

  return (
    <div className="flex flex-col min-h-screen">
      <Ticker />
      <Nav />

      {notFound && !isMe ? (
        <div className="px-10 py-32 flex flex-col items-center text-center gap-4">
          <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-red">
            ★ Inconnu au bataillon
          </div>
          <h1
            className="font-bold leading-[0.95] tracking-[-0.04em]"
            style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
          >
            @{targetUsername}
          </h1>
          <p className="text-[14px] text-ink-2 max-w-[420px]">
            Ce pseudo n&apos;existe pas (encore).
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-3 px-5 py-3 border border-ink text-ink font-semibold text-[12px] tracking-wide hover:border-red hover:text-red transition-colors rounded-md"
          >
            RETOUR
            <span aria-hidden>→</span>
          </Link>
        </div>
      ) : (
        <>
          <section className="border-b border-line">
            <div className="grid grid-cols-[1fr_auto] gap-0 max-[900px]:grid-cols-1">
              <div className="px-8 py-6 max-md:px-5">
                {!isMe && view && (
                  <div className="mb-4">
                    <FollowButton targetUserId={view.userId} isMe={isMe} />
                  </div>
                )}

                <div className="flex items-start gap-5 max-md:flex-col max-md:items-center max-md:text-center">
                  <ProfileAvatar username={displayUsername} src={view?.avatarUrl ?? null} />
                  <div className="flex flex-col gap-3 min-w-0 pt-1">
                    <div
                      className="flex items-center gap-5 max-md:justify-center flex-wrap"
                      style={{ minHeight: "clamp(56px, 7vw, 80px)" }}
                    >
                    <h1
                      className="leading-none tracking-[-0.01em] break-words"
                      style={{
                        fontFamily: view?.usernameFontSlug
                          ? fontStack(view.usernameFontSlug)
                          : "var(--font-marker)",
                        color: findColor(view?.usernameColorSlug),
                        fontSize: "clamp(40px, 5.5vw, 64px)",
                      }}
                    >
                      {displayUsername}
                    </h1>
                    {isMe && (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        title="Modifier le profil"
                        aria-label="Modifier le profil"
                        className="shrink-0 w-7 h-7 flex items-center justify-center border border-line-2 hover:border-ink hover:text-ink text-ink-3 rounded-md transition-colors cursor-pointer"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                    )}
                    </div>

                    {createdAt && (
                      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-4 -mt-1 max-md:text-center">
                        Membre depuis le {formatDate(createdAt)}
                      </div>
                    )}

                    <div className="flex items-center gap-3 flex-wrap max-md:justify-center font-mono text-[11px] tracking-[0.16em] uppercase">
                      <RoleBadge role={role} size="md" showLabel className="text-red" />
                      <span className="text-ink-4">·</span>
                      <button
                        type="button"
                        onClick={() => followStats.stats.followers > 0 && setFollowList("followers")}
                        disabled={followStats.stats.followers === 0}
                        className="text-ink-3 hover:text-red transition-colors cursor-pointer disabled:cursor-default disabled:hover:text-ink-3"
                      >
                        <span className="text-ink">{followStats.stats.followers}</span> abonnés
                      </button>
                      <span className="text-ink-4">·</span>
                      <button
                        type="button"
                        onClick={() => followStats.stats.following > 0 && setFollowList("following")}
                        disabled={followStats.stats.following === 0}
                        className="text-ink-3 hover:text-red transition-colors cursor-pointer disabled:cursor-default disabled:hover:text-ink-3"
                      >
                        <span className="text-ink">{followStats.stats.following}</span> suivis
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 border-l border-line max-[900px]:grid-cols-4 max-[900px]:border-l-0 max-[900px]:border-t max-md:grid-cols-2">
                <StatCell value={stats?.rank ? `#${stats.rank}` : "—"} label="Rang" />
                <StatCell
                  value={stats ? String(stats.messages) : "—"}
                  label="Messages"
                />
                <StatCell
                  value={stats ? formatWatch(stats.watchSeconds) : "—"}
                  label="Visionnage"
                />
                <StatCell
                  value={stats ? String(stats.suggestions) : "—"}
                  label="Suggestions"
                />
              </div>
            </div>
          </section>

          {view && (
            <section className="px-8 py-8 border-b border-line max-md:px-5 max-md:py-6">
              <div className="grid grid-cols-[300px_1fr] gap-6 max-md:grid-cols-1">
                <div className="flex flex-col gap-5">
                  <div>
                    <SectionHeader title="À propos" />
                    <BioBlock
                      profile={view}
                      isMe={isMe}
                      onEditClick={() => setEditing(true)}
                    />
                  </div>
                  <div>
                    <SectionHeader title="Badges" />
                    <BadgeList userId={view.userId} />
                  </div>
                </div>

                <div>
                  <SectionHeader title="Top 4" />
                  <TopFilms userId={view.userId} editable={isMe} />
                </div>
              </div>
            </section>
          )}

          {view && (
            <section className="px-8 py-8 border-b border-line max-md:px-5 max-md:py-6">
              <SectionHeader title="Livre d'or" />
              <Guestbook
                profileUserId={view.userId}
                profileUsername={view.username}
                isOwner={isMe}
              />
            </section>
          )}

          {!user && (
            <section className="px-8 py-10 border-b border-line text-center flex flex-col items-center gap-3 max-md:px-5">
              <p className="text-[13px] text-ink-2 max-w-[420px]">
                Pas encore de compte ? Crée le tien depuis la home pour
                apparaître dans le classement.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-3 px-5 py-2.5 border border-ink text-ink font-semibold text-[12px] tracking-wide hover:border-red hover:text-red transition-colors rounded-md"
              >
                RETOUR
                <span aria-hidden>→</span>
              </Link>
            </section>
          )}
        </>
      )}

      {loading && !view && !notFound && (
        <div className="px-10 py-20 font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase">
          Chargement…
        </div>
      )}

      <footer className="mt-auto px-10 py-6 flex justify-between items-center font-mono font-medium text-[11px] tracking-[0.04em] text-ink-4 max-md:px-5 max-md:py-4 max-md:flex-col max-md:gap-2">
        <span>CLUBCINE.XYZ · CHANNEL 01 · 2026</span>
        <Link href="/" className="hover:text-ink transition-colors">
          ← RETOUR
        </Link>
      </footer>

      {editing && user && (
        <ProfileEditModal
          profile={
            myProfile ?? {
              userId: user.id,
              username:
                (user.user_metadata?.username as string | undefined) ??
                targetUsername,
              bio: "",
              letterboxd: "",
              avatarUrl: null,
              role: "spectateur",
              usernameFontSlug: null,
              usernameColorSlug: null,
            }
          }
          onClose={() => setEditing(false)}
        />
      )}

      {followList && view && (
        <FollowListModal
          userId={view.userId}
          username={view.username}
          kind={followList}
          onClose={() => setFollowList(null)}
        />
      )}
    </div>
  );
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  return <ProfileContent usernameParam={username} />;
}
