"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import { BadgeIcon } from "@/components/RoleBadge";

const ROLES = ["spectateur", "soutien", "moderateur", "admin"] as const;
type Role = (typeof ROLES)[number];

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
      <img src={src} alt="" className="w-8 h-8 rounded-full object-cover border border-line-2" />
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
  const { user, profile, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [{ data: profs }, { data: bdgs }, { data: ubs }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id,username,avatar_url,role,created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("badges")
          .select("slug,label,color")
          .order("slug", { ascending: true }),
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
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

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
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("user_id", userId);
    setBusy(null);
    if (error) {
      setFeedback({ kind: "err", text: error.message });
      return;
    }
    setProfiles((prev) => prev.map((p) => (p.user_id === userId ? { ...p, role } : p)));
    setFeedback({ kind: "ok", text: `Rôle → ${role}` });
  };

  const toggleBadge = async (userId: string, slug: string, has: boolean) => {
    setBusy(`badge:${userId}:${slug}`);
    if (has) {
      const { error } = await supabase
        .from("user_badges")
        .delete()
        .eq("user_id", userId)
        .eq("badge_slug", slug);
      setBusy(null);
      if (error) {
        setFeedback({ kind: "err", text: error.message });
        return;
      }
      setUserBadges((prev) => {
        const next = new Map(prev);
        const set = new Set(next.get(userId) ?? []);
        set.delete(slug);
        next.set(userId, set);
        return next;
      });
      setFeedback({ kind: "ok", text: `Badge ${slug} retiré` });
    } else {
      const { error } = await supabase
        .from("user_badges")
        .insert({ user_id: userId, badge_slug: slug, awarded_reason: "admin grant" });
      setBusy(null);
      if (error) {
        setFeedback({ kind: "err", text: error.message });
        return;
      }
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

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Ticker />
        <Nav />
        <div className="px-10 py-20 font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase">
          Chargement…
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col min-h-screen">
        <Ticker />
        <Nav />
        <div className="px-10 py-32 flex flex-col items-center gap-6 text-center">
          <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red">
            ★ Accès refusé
          </div>
          <h1
            className="font-bold leading-[0.95] tracking-[-0.04em]"
            style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
          >
            Réservé aux admins
          </h1>
          <Link
            href="/"
            className="inline-flex items-center gap-3 px-5 py-3 border border-ink text-ink font-semibold text-[12px] tracking-wide hover:border-red hover:text-red transition-colors rounded-md"
          >
            RETOUR
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Ticker />
      <Nav />

      <header className="px-10 py-16 border-b border-line max-md:px-5 max-md:py-12">
        <div className="font-mono font-semibold text-[11px] leading-none tracking-[0.16em] uppercase text-ink-3 mb-3">
          ★ <span className="text-red font-bold">Admin</span>
          {" · Channel 01"}
        </div>
        <h1
          className="font-bold leading-[0.95] tracking-[-0.04em]"
          style={{ fontSize: "clamp(40px, 5vw, 72px)" }}
        >
          Users
        </h1>
        <p className="text-[14px] leading-[1.6] text-ink-2 max-w-[560px] mt-3">
          Donne / retire un rôle ou un badge en un clic. Plus de SQL à écrire.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Link
            href="/admin/suggestions"
            className="text-[12px] font-mono uppercase tracking-[0.16em] text-ink-3 hover:text-red transition-colors"
          >
            → suggestions
          </Link>
          <Link
            href="/admin/bugs"
            className="text-[12px] font-mono uppercase tracking-[0.16em] text-ink-3 hover:text-red transition-colors"
          >
            → bugs
          </Link>
          <Link
            href="/admin/emotes"
            className="text-[12px] font-mono uppercase tracking-[0.16em] text-ink-3 hover:text-red transition-colors"
          >
            → emotes
          </Link>
        </div>
      </header>

      <div className="px-10 py-6 border-b border-line flex flex-wrap items-center gap-4 max-md:px-5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Chercher un pseudo…"
          className="bg-transparent border border-line-2 px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink rounded-md min-w-[260px]"
        />
        <div className="ml-auto font-mono text-[11px] tracking-[0.04em] text-ink-3">
          {loading ? "…" : `${filtered.length} / ${profiles.length}`}
        </div>
        {feedback && (
          <div
            className={`font-mono text-[11px] tracking-[0.04em] ${feedback.kind === "ok" ? "text-red" : "text-red"}`}
          >
            {feedback.kind === "ok" ? "★" : "✕"} {feedback.text}
          </div>
        )}
      </div>

      <main className="px-10 py-8 max-md:px-5">
        {loading ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-12 text-center">
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-16 text-center">
            ★ Aucun résultat
          </div>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((p) => {
              const userBadgesSet = userBadges.get(p.user_id) ?? new Set<string>();
              return (
                <li
                  key={p.user_id}
                  className="border-t border-line first:border-t-0 py-5 grid grid-cols-[auto_1fr_auto] gap-5 items-start max-md:grid-cols-1"
                >
                  <ProfileAvatar username={p.username} src={p.avatar_url} />

                  <div className="flex flex-col gap-3 min-w-0">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <Link
                        href={`/u/${encodeURIComponent(p.username)}`}
                        className="font-semibold text-[15px] text-ink hover:text-red transition-colors"
                      >
                        @{p.username}
                      </Link>
                      <span className="font-mono text-[10px] tracking-[0.04em] text-ink-4">
                        {new Date(p.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {badges.map((b) => {
                        const has = userBadgesSet.has(b.slug);
                        const loadingThis = busy === `badge:${p.user_id}:${b.slug}`;
                        return (
                          <button
                            key={b.slug}
                            type="button"
                            onClick={() => toggleBadge(p.user_id, b.slug, has)}
                            disabled={loadingThis}
                            title={b.label}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-[10px] font-mono tracking-[0.08em] uppercase rounded-md transition-colors cursor-pointer disabled:opacity-30 ${
                              has
                                ? "border-red text-ink"
                                : "border-line-2 text-ink-4 hover:text-ink hover:border-ink"
                            }`}
                          >
                            <BadgeIcon slug={b.slug} size={12} color={has ? b.color : undefined} />
                            {b.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 max-md:mt-3">
                    <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
                      Rôle
                    </span>
                    <select
                      value={p.role}
                      onChange={(e) => updateRole(p.user_id, e.target.value as Role)}
                      disabled={busy === `role:${p.user_id}`}
                      className="bg-bg border border-line-2 text-ink text-[12px] font-mono tracking-[0.04em] uppercase px-2 py-1.5 rounded-md cursor-pointer focus:border-ink outline-none disabled:opacity-30"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <footer className="mt-auto px-10 py-6 flex justify-between items-center font-mono font-medium text-[11px] tracking-[0.04em] text-ink-4 max-md:px-5 max-md:py-4 max-md:flex-col max-md:gap-2">
        <span>CLUBCINE.XYZ · ADMIN · 2026</span>
        <Link href="/" className="hover:text-ink transition-colors">
          ← RETOUR
        </Link>
      </footer>
    </div>
  );
}

export default function UsersAdminPage() {
  return <UsersAdminContent />;
}
