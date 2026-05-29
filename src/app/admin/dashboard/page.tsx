"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import { RoleBadge } from "@/components/RoleBadge";
import AdminCrossNav from "@/components/AdminCrossNav";

type Status = "pending" | "accepted" | "rejected";
type SuggestKind = "film" | "soiree";

interface ProfileRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface SuggestionRow {
  id: string;
  kind: SuggestKind;
  status: Status;
  username: string | null;
  payload: { title?: string } | null;
  created_at: string;
}

interface BugRow {
  id: string;
  status: Status;
  username: string | null;
  message: string;
  created_at: string;
}

interface StaffRow {
  id: string;
  status: Status;
  username: string;
  motivation: string;
  created_at: string;
}

interface WatchRow {
  username: string;
  seconds: number;
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  if (h >= 1000) return `${(h / 1000).toFixed(1)}k h`;
  return `${h} h`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ProfileAvatar({ username, src, size = 28 }: { username: string; src: string | null; size?: number }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-line-2 shrink-0"
      />
    );
  }
  const letter = username.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className="rounded-full border border-line-2 flex items-center justify-center font-semibold bg-bg shrink-0"
    >
      {letter}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  href?: string;
  cta?: string;
  accent?: boolean;
}

function KpiCard({ label, value, sub, href, cta, accent }: KpiCardProps) {
  return (
    <div className="border border-line rounded-md p-5 flex flex-col gap-3 bg-surface">
      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
        {label}
      </div>
      <div
        className={`font-bold leading-none tracking-[-0.02em] ${accent ? "text-red" : "text-ink"}`}
        style={{ fontSize: "clamp(32px, 4vw, 48px)" }}
      >
        {value}
      </div>
      {sub && (
        <div className="font-mono text-[11px] tracking-[0.04em] text-ink-3 leading-[1.5]">
          {sub}
        </div>
      )}
      {href && cta && (
        <Link
          href={href}
          className="mt-auto font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 hover:text-red transition-colors"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

function DashboardContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [bugs, setBugs] = useState<BugRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [watch, setWatch] = useState<WatchRow[]>([]);
  const [messageCount, setMessageCount] = useState<number | null>(null);
  const [followsCount, setFollowsCount] = useState<number | null>(null);
  const [emotesCount, setEmotesCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [
          profilesRes,
          suggestionsRes,
          bugsRes,
          staffRes,
          watchRes,
          messagesRes,
          followsRes,
          emotesRes,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("user_id,username,avatar_url,role,created_at")
            .order("created_at", { ascending: false })
            .limit(500),
          supabase
            .from("suggestions")
            .select("id,kind,status,username,payload,created_at")
            .order("created_at", { ascending: false })
            .limit(500),
          supabase
            .from("bug_reports")
            .select("id,status,username,message,created_at")
            .order("created_at", { ascending: false })
            .limit(500),
          supabase
            .from("staff_applications")
            .select("id,status,username,motivation,created_at")
            .order("created_at", { ascending: false })
            .limit(500),
          supabase
            .from("watch_time")
            .select("username,seconds")
            .order("seconds", { ascending: false })
            .limit(500),
          supabase
            .from("messages")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("emotes")
            .select("*", { count: "exact", head: true }),
        ]);

        if (cancelled) return;

        setProfiles((profilesRes.data ?? []) as ProfileRow[]);
        setSuggestions((suggestionsRes.data ?? []) as SuggestionRow[]);
        setBugs((bugsRes.data ?? []) as BugRow[]);
        setStaff((staffRes.data ?? []) as StaffRow[]);
        setWatch((watchRes.data ?? []) as WatchRow[]);
        setMessageCount(messagesRes.count ?? 0);
        setFollowsCount(followsRes.count ?? 0);
        setEmotesCount(emotesRes.count ?? 0);
      } catch (e) {
        console.error("[admin/dashboard] load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const stats = useMemo(() => {
    const roles = { spectateur: 0, soutien: 0, moderateur: 0, admin: 0 } as Record<string, number>;
    for (const p of profiles) {
      roles[p.role] = (roles[p.role] ?? 0) + 1;
    }

    const suggBuckets = {
      film: { pending: 0, accepted: 0, rejected: 0 },
      soiree: { pending: 0, accepted: 0, rejected: 0 },
    };
    for (const s of suggestions) {
      if (suggBuckets[s.kind]) suggBuckets[s.kind][s.status]++;
    }

    const bugBuckets = { pending: 0, accepted: 0, rejected: 0 };
    for (const b of bugs) bugBuckets[b.status]++;

    const staffBuckets = { pending: 0, accepted: 0, rejected: 0 };
    for (const a of staff) staffBuckets[a.status]++;

    const totalWatchSeconds = watch.reduce((sum, w) => sum + (w.seconds ?? 0), 0);

    const profileByUsername = new Map<string, ProfileRow>();
    for (const p of profiles) profileByUsername.set(p.username.toLowerCase(), p);

    const topWatchers = watch
      .slice(0, 5)
      .map((w) => ({ ...w, profile: profileByUsername.get(w.username.toLowerCase()) }));

    const recentSignups = profiles.slice(0, 5);
    const pendingStaff = staff.filter((s) => s.status === "pending").slice(0, 5);
    const pendingBugs = bugs.filter((b) => b.status === "pending").slice(0, 5);

    return {
      roles,
      suggBuckets,
      bugBuckets,
      staffBuckets,
      totalWatchSeconds,
      topWatchers,
      recentSignups,
      pendingStaff,
      pendingBugs,
    };
  }, [profiles, suggestions, bugs, staff, watch]);

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
            className="font-bold leading-[0.95] tracking-[-0.04em] text-balance"
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

  const pendingTotal =
    stats.suggBuckets.film.pending +
    stats.suggBuckets.soiree.pending +
    stats.bugBuckets.pending +
    stats.staffBuckets.pending;

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
          className="font-bold leading-[0.95] tracking-[-0.04em] text-balance"
          style={{ fontSize: "clamp(40px, 5vw, 72px)" }}
        >
          Dashboard
        </h1>
        <p className="text-[14px] leading-[1.6] text-ink-2 max-w-[560px] mt-3 text-balance">
          Vue d&apos;ensemble. {loading ? "Chargement…" : (
            <>
              <span className="text-red">{pendingTotal}</span> élément
              {pendingTotal > 1 ? "s" : ""} en attente de traitement.
            </>
          )}
        </p>
        <div className="mt-4">
          <AdminCrossNav current="/admin/dashboard" />
        </div>
      </header>

      <main className="px-10 py-10 max-md:px-5 flex flex-col gap-10">
        {loading ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-12 text-center">
            Chargement…
          </div>
        ) : (
          <>
            <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <KpiCard
                label="Users"
                value={profiles.length}
                sub={
                  <>
                    {stats.roles.admin} admin · {stats.roles.moderateur} modo
                    <br />
                    {stats.roles.soutien} soutien · {stats.roles.spectateur} spectateur
                  </>
                }
                href="/admin/users"
                cta="Gérer"
              />
              <KpiCard
                label="Suggestions pending"
                value={stats.suggBuckets.film.pending + stats.suggBuckets.soiree.pending}
                sub={
                  <>
                    {stats.suggBuckets.film.pending} films · {stats.suggBuckets.soiree.pending} soirées
                    <br />
                    {stats.suggBuckets.film.accepted + stats.suggBuckets.soiree.accepted} acceptées au total
                  </>
                }
                href="/admin/suggestions"
                cta="Traiter"
                accent={stats.suggBuckets.film.pending + stats.suggBuckets.soiree.pending > 0}
              />
              <KpiCard
                label="Bugs pending"
                value={stats.bugBuckets.pending}
                sub={
                  <>
                    {stats.bugBuckets.accepted} acceptés · {stats.bugBuckets.rejected} rejetés
                  </>
                }
                href="/admin/bugs"
                cta="Inspecter"
                accent={stats.bugBuckets.pending > 0}
              />
              <KpiCard
                label="Candidatures staff"
                value={stats.staffBuckets.pending}
                sub={
                  <>
                    {stats.staffBuckets.accepted} promus · {stats.staffBuckets.rejected} rejetées
                  </>
                }
                href="/admin/staff"
                cta="Lire"
                accent={stats.staffBuckets.pending > 0}
              />
              <KpiCard
                label="Antenne cumulée"
                value={formatHours(stats.totalWatchSeconds)}
                sub={`${watch.length} viewer${watch.length > 1 ? "s" : ""} avec activité`}
              />
              <KpiCard
                label="Chat · 30 derniers jours"
                value={messageCount ?? "…"}
                sub={
                  <>
                    {emotesCount ?? 0} emote{(emotesCount ?? 0) > 1 ? "s" : ""} · {followsCount ?? 0} follow{(followsCount ?? 0) > 1 ? "s" : ""}
                  </>
                }
                href="/admin/emotes"
                cta="Emotes"
              />
            </section>

            <section className="grid grid-cols-[1.2fr_1fr] gap-10 max-[900px]:grid-cols-1 max-[900px]:gap-8">
              <div className="flex flex-col gap-5">
                <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3 text-balance">
                  ★ Top antenne
                </h2>
                {stats.topWatchers.length === 0 ? (
                  <div className="font-mono text-[11px] text-ink-3">aucune activité</div>
                ) : (
                  <ol className="flex flex-col">
                    {stats.topWatchers.map((w, i) => (
                      <li
                        key={w.username}
                        className="border-t border-line first:border-t-0 py-3 flex items-center gap-3"
                      >
                        <span className="font-mono text-[12px] tracking-[0.08em] text-ink-3 w-6 shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <ProfileAvatar username={w.username} src={w.profile?.avatar_url ?? null} />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/u/${encodeURIComponent(w.username)}`}
                            className="font-semibold text-[14px] text-ink hover:text-red transition-colors"
                          >
                            @{w.username}
                          </Link>
                          {w.profile?.role && w.profile.role !== "spectateur" && (
                            <span className="ml-2 inline-flex align-middle">
                              <RoleBadge role={w.profile.role} size="sm" />
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[12px] text-ink-2 shrink-0">
                          {formatHours(w.seconds)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="flex flex-col gap-5">
                <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3 text-balance">
                  ★ Dernières inscriptions
                </h2>
                {stats.recentSignups.length === 0 ? (
                  <div className="font-mono text-[11px] text-ink-3">aucune inscription</div>
                ) : (
                  <ul className="flex flex-col">
                    {stats.recentSignups.map((p) => (
                      <li
                        key={p.user_id}
                        className="border-t border-line first:border-t-0 py-3 flex items-center gap-3"
                      >
                        <ProfileAvatar username={p.username} src={p.avatar_url} />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/u/${encodeURIComponent(p.username)}`}
                            className="font-semibold text-[14px] text-ink hover:text-red transition-colors"
                          >
                            @{p.username}
                          </Link>
                          {p.role && p.role !== "spectateur" && (
                            <span className="ml-2 inline-flex align-middle">
                              <RoleBadge role={p.role} size="sm" />
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-ink-3 shrink-0">
                          {formatDate(p.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-10 max-[900px]:grid-cols-1 max-[900px]:gap-8">
              <div className="flex flex-col gap-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3 text-balance">
                    ★ Candidatures staff à traiter
                  </h2>
                  <Link href="/admin/staff" className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3 hover:text-red transition-colors after:content-['_→']">
                    Tout voir
                  </Link>
                </div>
                {stats.pendingStaff.length === 0 ? (
                  <div className="font-mono text-[11px] text-ink-3">boîte vide</div>
                ) : (
                  <ul className="flex flex-col">
                    {stats.pendingStaff.map((s) => (
                      <li key={s.id} className="border-t border-line first:border-t-0 py-3 flex flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <Link
                            href={`/u/${encodeURIComponent(s.username)}`}
                            className="font-semibold text-[13px] text-ink hover:text-red transition-colors"
                          >
                            @{s.username}
                          </Link>
                          <span className="font-mono text-[10px] text-ink-3 shrink-0">
                            {formatDate(s.created_at)}
                          </span>
                        </div>
                        <p className="text-[12px] leading-[1.5] text-ink-2 line-clamp-2 text-balance">
                          {s.motivation}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3 text-balance">
                    ★ Bugs à inspecter
                  </h2>
                  <Link href="/admin/bugs" className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3 hover:text-red transition-colors after:content-['_→']">
                    Tout voir
                  </Link>
                </div>
                {stats.pendingBugs.length === 0 ? (
                  <div className="font-mono text-[11px] text-ink-3">boîte vide</div>
                ) : (
                  <ul className="flex flex-col">
                    {stats.pendingBugs.map((b) => (
                      <li key={b.id} className="border-t border-line first:border-t-0 py-3 flex flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-3">
                          {b.username ? (
                            <Link
                              href={`/u/${encodeURIComponent(b.username)}`}
                              className="font-semibold text-[13px] text-ink hover:text-red transition-colors"
                            >
                              @{b.username}
                            </Link>
                          ) : (
                            <span className="font-semibold text-[13px] text-ink-3">anonyme</span>
                          )}
                          <span className="font-mono text-[10px] text-ink-3 shrink-0">
                            {formatDate(b.created_at)}
                          </span>
                        </div>
                        <p className="text-[12px] leading-[1.5] text-ink-2 line-clamp-2 text-balance">
                          {b.message}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="mt-auto px-10 py-6 flex justify-between items-center font-mono font-medium text-[11px] tracking-[0.04em] text-ink-3 max-md:px-5 max-md:py-4 max-md:flex-col max-md:gap-2">
        <span>CLUBCINE.XYZ · ADMIN · 2026</span>
        <Link href="/" className="hover:text-ink transition-colors">
          ← RETOUR
        </Link>
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
