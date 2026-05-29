"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
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
import {
  normalizeTwitter,
  twitterHandle,
  normalizeInstagram,
  instagramHandle,
} from "@/lib/socials";
import { useEscapeKey } from "@/lib/use-escape-key";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { safeImageUrl } from "@/lib/safe-url";
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
  twitter: string | null;
  instagram: string | null;
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
    twitter: row.twitter ?? "",
    instagram: row.instagram ?? "",
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
  if (!iso) return "–";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function ProfileAvatar({ username, src }: { username: string; src: string | null }) {
  const safeSrc = safeImageUrl(src);
  if (safeSrc) {
    return (
      <div className="w-[140px] h-[140px] rounded-full overflow-hidden border border-red bg-bg shrink-0 max-md:w-[110px] max-md:h-[110px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={safeSrc} alt={username} className="w-full h-full object-cover" />
      </div>
    );
  }
  const letter = username.trim().slice(0, 2).toUpperCase() || "?";
  return (
    <div
      className="w-[140px] h-[140px] rounded-full border border-red flex items-center justify-center bg-bg shrink-0 max-md:w-[110px] max-md:h-[110px] relative overflow-hidden"
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

function SocialLink({
  href,
  label,
  handle,
}: {
  href: string;
  label: string;
  handle: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-1.5 font-mono text-[10px] tracking-[0.08em] uppercase text-ink-3 hover:text-red transition-colors"
    >
      <span aria-hidden>★</span>
      {label} / {handle || "qui"}
    </a>
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
  const lbHandle = profile.letterboxd ? letterboxdProfileHandle(profile.letterboxd) : "";
  const xHandle = profile.twitter ? twitterHandle(profile.twitter) : "";
  const igHandle = profile.instagram ? instagramHandle(profile.instagram) : "";
  const hasSocials = !!(profile.letterboxd || profile.twitter || profile.instagram);

  return (
    <div className="border border-dashed border-line-2 rounded-md p-4 flex flex-col gap-3 text-center">
      {profile.bio ? (
        <p className="text-[13px] leading-[1.6] text-ink-2 text-balance">{profile.bio}</p>
      ) : (
        <p className="text-[13px] text-ink-3 italic text-balance">Aucune bio définie.</p>
      )}
      {hasSocials && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
          {profile.letterboxd && (
            <SocialLink href={profile.letterboxd} label="letterboxd" handle={lbHandle} />
          )}
          {profile.twitter && (
            <SocialLink href={profile.twitter} label="x" handle={xHandle} />
          )}
          {profile.instagram && (
            <SocialLink href={profile.instagram} label="instagram" handle={igHandle} />
          )}
        </div>
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

function SocialField({
  label,
  prefix,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
        {label}
      </span>
      <div className="flex items-stretch border border-line-2 focus-within:border-ink rounded-md overflow-hidden bg-transparent">
        <span className="px-3 flex items-center font-mono text-[12px] text-ink-3 bg-line/40 select-none whitespace-nowrap">
          {prefix}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 outline-none"
        />
      </div>
    </label>
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
  const [twitter, setTwitter] = useState(twitterHandle(profile.twitter));
  const [instagram, setInstagram] = useState(instagramHandle(profile.instagram));
  const [usernameFontSlug, setUsernameFontSlug] = useState<string>(
    profile.usernameFontSlug ?? "marker"
  );
  const [usernameColorSlug, setUsernameColorSlug] = useState<string>(
    profile.usernameColorSlug ?? "default"
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const blobPreview = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    if (!blobPreview) return;
    return () => URL.revokeObjectURL(blobPreview);
  }, [blobPreview]);

  const previewUrl = removeAvatar
    ? null
    : blobPreview ?? profile.avatarUrl;

  const onSelectFile = (file: File) => {
    setRemoveAvatar(false);
    setAvatarFile(file);
  };

  const onRemove = () => {
    if (avatarFile) {
      setAvatarFile(null);
      return;
    }
    setRemoveAvatar(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErr(null);
    try {
      let avatarUrl: string | null | undefined = undefined;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${profile.userId}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, {
            upsert: true,
            cacheControl: "3600",
            contentType: avatarFile.type,
          });
        if (upErr) {
          setErr(upErr.message);
          return;
        }
        const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = `${pub.publicUrl}?t=${Date.now()}`;
      } else if (removeAvatar && profile.avatarUrl) {
        try {
          const u = new URL(profile.avatarUrl);
          const segs = u.pathname.split("/");
          const idx = segs.findIndex((s) => s === "avatars");
          const path = idx >= 0 ? segs.slice(idx + 1).join("/") : null;
          if (path) await supabase.storage.from("avatars").remove([path]);
        } catch {}
        avatarUrl = null;
      }

      const patch: Parameters<typeof updateProfile>[0] = {
        bio: bio.trim(),
        letterboxd: letterboxd.trim() ? normalizeLetterboxdProfile(letterboxd) : "",
        twitter: twitter.trim() ? normalizeTwitter(twitter) : "",
        instagram: instagram.trim() ? normalizeInstagram(instagram) : "",
        usernameFontSlug:
          usernameFontSlug === "marker" || usernameFontSlug === "default"
            ? null
            : usernameFontSlug,
        usernameColorSlug: usernameColorSlug === "default" ? null : usernameColorSlug,
      };
      if (avatarUrl !== undefined) patch.avatarUrl = avatarUrl;

      const result = await updateProfile(patch);
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
          <AvatarUpload
            username={profile.username}
            previewUrl={previewUrl}
            hasCurrentAvatar={!!profile.avatarUrl || !!avatarFile}
            onSelectFile={onSelectFile}
            onRemove={onRemove}
          />

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
            <span className="font-mono text-[10px] tracking-[0.04em] text-ink-3 self-end">
              {bio.length}/200
            </span>
          </label>

          <SocialField
            label="Letterboxd"
            prefix="letterboxd.com/"
            value={letterboxd}
            onChange={setLetterboxd}
            placeholder="ton-pseudo"
          />

          <SocialField
            label="X (Twitter)"
            prefix="x.com/"
            value={twitter}
            onChange={setTwitter}
            placeholder="ton-pseudo"
          />

          <SocialField
            label="Instagram"
            prefix="instagram.com/"
            value={instagram}
            onChange={setInstagram}
            placeholder="ton-pseudo"
          />

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
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileContent({ usernameParam }: { usernameParam: string }) {
  const { user, username: meUsername, profile: myProfile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [target, setTarget] = useState<UserProfile | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [followList, setFollowList] = useState<"followers" | "following" | null>(null);

  const targetUsername = decodeURIComponent(usernameParam);
  const isMe =
    !!meUsername && meUsername.toLowerCase() === targetUsername.toLowerCase();
  const view = isMe ? myProfile ?? target : target;
  const showSkeleton = (loading || authLoading) && !view && !notFound;

  const followStats = useFollowStats(view?.userId ?? null, isMe);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setNotFound(false);

      const { data: profileRow } = await supabase
        .from("profiles")
        .select(
          "user_id,username,bio,letterboxd,twitter,instagram,avatar_url,role,created_at,username_font_slug,username_color_slug"
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

      {showSkeleton ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-10 py-32">
          <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
            ★ Chargement du profil
          </div>
          <div
            className="font-bold leading-[0.95] tracking-[-0.04em] text-balance text-ink-3"
            style={{ fontSize: "clamp(40px, 6vw, 72px)", fontFamily: "var(--font-marker)" }}
          >
            @{targetUsername}
          </div>
        </div>
      ) : notFound && !isMe ? (
        <div className="px-10 py-32 flex flex-col items-center text-center gap-4">
          <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-red">
            ★ Inconnu au bataillon
          </div>
          <h1
            className="font-bold leading-[0.95] tracking-[-0.04em] text-balance"
            style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
          >
            @{targetUsername}
          </h1>
          <p className="text-[14px] text-ink-2 max-w-[420px] text-balance">
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
                      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 -mt-1 max-md:text-center">
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
                <StatCell value={stats?.rank ? `#${stats.rank}` : "–"} label="Rang" />
                <StatCell
                  value={stats ? String(stats.messages) : "–"}
                  label="Messages"
                />
                <StatCell
                  value={stats ? formatWatch(stats.watchSeconds) : "–"}
                  label="Visionnage"
                />
                <StatCell
                  value={stats ? String(stats.suggestions) : "–"}
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
              <p className="text-[13px] text-ink-2 max-w-[420px] text-balance">
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

      <footer className="mt-auto px-10 py-6 flex justify-between items-center font-mono font-medium text-[11px] tracking-[0.04em] text-ink-3 max-md:px-5 max-md:py-4 max-md:flex-col max-md:gap-2">
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
              twitter: "",
              instagram: "",
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
