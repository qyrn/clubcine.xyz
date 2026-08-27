"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAdminGuard } from "@/lib/use-admin-guard";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import { BadgeIcon } from "@/components/RoleBadge";
import ConfirmDialog from "@/components/ConfirmDialog";

const ROLES = ["spectateur", "soutien", "moderateur", "admin"] as const;
type Role = (typeof ROLES)[number];

const BADGE_CATEGORIES: { label: string; slugs: string[] }[] = [
  { label: "Spéciaux", slugs: ["admin", "founding-viewer", "top-10", "soiree-jouee", "supporter", "night-owl", "bug-hunter"] },
  { label: "Antenne", slugs: ["viewer-habitue", "viewer-cinephile", "viewer-connaisseur", "viewer-cingle", "viewer-legende"] },
  { label: "Chat", slugs: ["chatter-bavard", "chatter-animateur", "chatter-voix"] },
  { label: "Films", slugs: ["film-suggest-1", "film-suggest-5", "film-suggest-10"] },
  { label: "Soirées", slugs: ["soiree-suggest-1", "soiree-suggest-5", "soiree-suggest-10"] },
];

interface ProfileRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  role: Role;
  created_at: string;
}

interface Badge {
  slug: string;
  label: string;
  color: string;
}

interface UserBadgeRow {
  user_id: string;
  badge_slug: string;
}

function ProfileAvatar({ username, src }: { username: string; src: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="w-8 h-8 rounded-full object-cover border border-line-2 shrink-0" />
    );
  }
  const letter = username.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="w-8 h-8 rounded-full border border-line-2 flex items-center justify-center text-[12px] font-semibold bg-bg shrink-0">
      {letter}
    </div>
  );
}

function UsersAdminContent() {
  const { user, authLoading, allowed } = useAdminGuard();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; username: string } | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: profs }, { data: bdgs }, { data: ubs }] = await Promise.all([
          supabase.from("profiles").select("user_id,username,avatar_url,role,created_at").order("created_at", { ascending: false }).limit(500),
          supabase.from("badges").select("slug,label,color").order("slug", { ascending: true }),
          supabase.from("user_badges").select("user_id,badge_slug"),
        ]);
        if (cancelled) return;
        setProfiles((profs ?? []) as ProfileRow[]);
        setBadges((bdgs ?? []) as Badge[]);
        const map = new Map<string, Set<string>>();
        for (const ub of (ubs ?? []) as UserBadgeRow[]) {
          const set = map.get(ub.user_id) ?? new Set();
          set.add(ub.badge_slug);
          map.set(ub.user_id, set);
        }
        setUserBadges(map);
      } catch (e) {
        console.error("[admin/users] load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [allowed]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(t);
  }, [feedback]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => p.username.toLowerCase().includes(q));
  }, [profiles, search]);

  const updateRole = async (userId: string, role: Role) => {
    setBusy(`role:${userId}`);
    const { error } = await supabase.rpc("admin_set_role", { p_user_id: userId, p_role: role });
    setBusy(null);
    if (error) { setFeedback({ kind: "err", text: error.message }); return; }
    setProfiles((prev) => prev.map((p) => (p.user_id === userId ? { ...p, role } : p)));
    setFeedback({ kind: "ok", text: `Rôle → ${role}` });
  };

  const deleteUser = async (userId: string, username: string) => {
    setBusy(`delete:${userId}`);
    const { error } = await supabase.rpc("admin_delete_user", { p_user_id: userId });
    setBusy(null);
    if (error) { setFeedback({ kind: "err", text: error.message }); return; }
    setProfiles((prev) => prev.filter((p) => p.user_id !== userId));
    setFeedback({ kind: "ok", text: `@${username} supprimé` });
  };

  const toggleBadge = async (userId: string, slug: string, has: boolean) => {
    setBusy(`badge:${userId}:${slug}`);
    if (has) {
      const { error } = await supabase.from("user_badges").delete().eq("user_id", userId).eq("badge_slug", slug);
      setBusy(null);
      if (error) { setFeedback({ kind: "err", text: error.message }); return; }
      setUserBadges((prev) => {
        const next = new Map(prev);
        const set = new Set(next.get(userId) ?? []);
        set.delete(slug);
        next.set(userId, set);
        return next;
      });
      setFeedback({ kind: "ok", text: `Badge ${slug} retiré` });
    } else {
      const { error } = await supabase.from("user_badges").insert({ user_id: userId, badge_slug: slug, awarded_reason: null });
      setBusy(null);
      if (error) { setFeedback({ kind: "err", text: error.message }); return; }
      setUserBadges((prev) => {
        const next = new Map(prev);
        const set = new Set(next.get(userId) ?? []);
        set.add(slug);
        next.set(userId, set);
        return next;
      });
      setFeedback({ kind: "ok", text: `Badge ${slug} attribué` });
    }
  };

  return (
    <AdminGuard authLoading={authLoading} allowed={allowed}>
      <header className="px-10 py-8 border-b border-line max-md:px-5 max-md:py-6">
        <h1 className="font-mono text-[11px] font-bold tracking-[0.16em] uppercase text-ink mb-1">Users</h1>
        <p className="text-[13px] text-ink-3">{profiles.length} membre{profiles.length > 1 ? "s" : ""}</p>
      </header>

      <div className="px-10 py-4 border-b border-line flex flex-wrap items-center gap-4 max-md:px-5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Chercher un pseudo…"
          className="bg-transparent border border-line-2 px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink min-w-[260px]"
        />
        <div className="font-mono text-[11px] tracking-[0.04em] text-ink-3">
          {loading ? "…" : `${filtered.length} / ${profiles.length}`}
        </div>
        {feedback && (
          <div className={`font-mono text-[11px] tracking-[0.04em] ${feedback.kind === "ok" ? "text-ink" : "text-red"}`}>
            {feedback.kind === "ok" ? "★" : "✕"} {feedback.text}
          </div>
        )}
      </div>

      <main className="px-10 py-6 max-md:px-5">
        {loading ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-12 text-center">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-16 text-center">★ Aucun résultat</div>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((p) => {
              const userBadgesSet = userBadges.get(p.user_id) ?? new Set<string>();
              return (
                <li key={p.user_id} className="border-t border-line first:border-t-0 py-5 flex flex-col gap-4 max-md:gap-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <ProfileAvatar username={p.username} src={p.avatar_url} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <Link href={`/u/${encodeURIComponent(p.username)}`} className="font-semibold text-[15px] text-ink hover:text-red transition-colors">
                          @{p.username}
                        </Link>
                        <span className="font-mono text-[10px] tracking-[0.04em] text-ink-3">
                          {new Date(p.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Rôle</span>
                      <select
                        value={p.role}
                        onChange={(e) => updateRole(p.user_id, e.target.value as Role)}
                        disabled={busy === `role:${p.user_id}`}
                        className="bg-bg border border-line-2 text-ink text-[12px] font-mono tracking-[0.04em] uppercase px-2 py-1.5 cursor-pointer focus:border-ink outline-none disabled:opacity-30"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {p.user_id !== user?.id && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ userId: p.user_id, username: p.username })}
                          disabled={busy === `delete:${p.user_id}`}
                          aria-label={`Supprimer @${p.username}`}
                          title="Supprimer le compte"
                          className="inline-flex items-center justify-center w-8 h-8 border border-line-2 text-ink-3 hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pl-12 max-md:pl-0">
                    {BADGE_CATEGORIES.map((cat) => {
                      const catBadges = cat.slugs.map((slug) => badges.find((b) => b.slug === slug)).filter((b): b is Badge => !!b);
                      if (catBadges.length === 0) return null;
                      return (
                        <div key={cat.label} className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-ink-3 shrink-0 w-16">
                            {cat.label}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {catBadges.map((b) => {
                              const has = userBadgesSet.has(b.slug);
                              const loadingThis = busy === `badge:${p.user_id}:${b.slug}`;
                              return (
                                <button
                                  key={b.slug}
                                  type="button"
                                  onClick={() => toggleBadge(p.user_id, b.slug, has)}
                                  disabled={loadingThis}
                                  title={b.label}
                                  className={`inline-flex items-center gap-1.5 px-2 py-1 border text-[10px] font-mono tracking-[0.08em] uppercase transition-colors cursor-pointer disabled:opacity-30 ${
                                    has ? "border-red text-ink" : "border-line-2 text-ink-3 hover:text-ink hover:border-ink"
                                  }`}
                                >
                                  <BadgeIcon slug={b.slug} size={12} color={has ? b.color : undefined} />
                                  {b.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer le compte"
          message={`@${deleteTarget.username} sera définitivement supprimé : profil, follows, messages, temps d'antenne. Action irréversible.`}
          confirmLabel="Supprimer"
          destructive
          onConfirm={() => deleteUser(deleteTarget.userId, deleteTarget.username)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </AdminGuard>
  );
}

export default function UsersAdminPage() {
  return <UsersAdminContent />;
}
