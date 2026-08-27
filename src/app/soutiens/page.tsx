"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { ROLE_ICONS, RoleBadge } from "@/components/RoleBadge";
import { fontStack, findColor } from "@/lib/fonts";
import { safeImageUrl } from "@/lib/safe-url";

interface Supporter {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  fontSlug: string | null;
  colorSlug: string | null;
  since: string;
}

interface BadgeRow {
  user_id: string;
  awarded_at: string;
}

interface ProfileRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  username_font_slug: string | null;
  username_color_slug: string | null;
}

type LoadState = "loading" | "ready" | "error";

const sinceFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

function formatSince(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "l'ouverture";
  return sinceFormatter.format(date);
}

function SupporterCard({ supporter }: { supporter: Supporter }) {
  const avatarSrc = safeImageUrl(supporter.avatarUrl);
  const letter = supporter.username.trim().charAt(0).toUpperCase() || "?";
  return (
    <Link
      href={`/u/${encodeURIComponent(supporter.username)}`}
      className="border border-line rounded-md px-4 py-4 flex items-center gap-3 hover:border-line-2 transition-colors"
    >
      {avatarSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarSrc}
          alt=""
          className="w-9 h-9 rounded-full object-cover border border-line-2 shrink-0"
        />
      ) : (
        <span className="w-9 h-9 rounded-full border border-line-2 flex items-center justify-center font-semibold text-[13px] text-ink shrink-0 bg-bg">
          {letter}
        </span>
      )}
      <span className="flex flex-col gap-1 min-w-0">
        <span className="flex items-center gap-1.5 min-w-0">
          <span
            className="truncate text-[15px] leading-none"
            style={{
              fontFamily: supporter.fontSlug ? fontStack(supporter.fontSlug) : undefined,
              color: findColor(supporter.colorSlug),
            }}
          >
            {supporter.username}
          </span>
          {ROLE_ICONS[supporter.role] ? (
            <RoleBadge role={supporter.role} size="sm" className="shrink-0" />
          ) : null}
        </span>
        <span className="font-mono text-[10px] tracking-[0.04em] text-ink-3">
          depuis {formatSince(supporter.since)}
        </span>
      </span>
    </Link>
  );
}

export default function SoutiensPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [supporters, setSupporters] = useState<Supporter[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: badges, error: badgeErr } = await supabase
        .from("user_badges")
        .select("user_id,awarded_at")
        .eq("badge_slug", "supporter")
        .order("awarded_at", { ascending: true });

      if (cancelled) return;
      if (badgeErr) {
        setState("error");
        return;
      }

      const rows = (badges ?? []) as BadgeRow[];
      if (rows.length === 0) {
        setSupporters([]);
        setState("ready");
        return;
      }

      const ids = rows.map((b) => b.user_id);
      const { data: profiles, error: profileErr } = await supabase
        .from("profiles")
        .select(
          "user_id,username,avatar_url,role,username_font_slug,username_color_slug"
        )
        .in("user_id", ids);

      if (cancelled) return;
      if (profileErr) {
        setState("error");
        return;
      }

      const byId = new Map<string, ProfileRow>();
      for (const p of (profiles ?? []) as ProfileRow[]) byId.set(p.user_id, p);

      const merged: Supporter[] = [];
      for (const b of rows) {
        const p = byId.get(b.user_id);
        if (!p) continue;
        merged.push({
          userId: p.user_id,
          username: p.username,
          avatarUrl: p.avatar_url,
          role: p.role ?? "spectateur",
          fontSlug: p.username_font_slug,
          colorSlug: p.username_color_slug,
          since: b.awarded_at,
        });
      }

      setSupporters(merged);
      setState("ready");
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Ticker />
      <Nav />

      <header className="px-10 py-24 border-b border-line flex flex-col items-center text-center gap-6 max-md:px-5 max-md:py-16">
        <div className="font-mono font-semibold text-[11px] leading-none tracking-[0.16em] uppercase text-ink-3">
          ★ <span className="text-red font-bold">Générique</span>
          {" · Channel 01"}
        </div>
        <h1
          className="font-bold leading-[0.95] tracking-[-0.04em] uppercase text-balance"
          style={{ fontSize: "clamp(48px, 7vw, 112px)" }}
        >
          Les soutiens
        </h1>
        <p className="text-[15px] leading-[1.6] text-ink-2 max-w-[560px] text-balance">
          Ces gens paient le serveur pour que la chaîne tourne. Pas de pub, pas
          d&apos;abonnement, pas de catalogue infini. Un don ponctuel, et un merci
          affiché ici.
        </p>
        <a
          href="https://ko-fi.com/clubcinefr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-5 py-2.5 border border-ink text-ink font-semibold text-[12px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors rounded-md"
        >
          Faire un don <span aria-hidden>→</span>
        </a>
      </header>

      <section className="px-10 py-10 border-b border-line w-full max-w-[1100px] mx-auto max-md:px-5">
        {state === "loading" ? (
          <div className="py-10 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
            chargement…
          </div>
        ) : state === "error" ? (
          <div className="py-10 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
            indisponible
          </div>
        ) : supporters.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <p className="text-[14px] text-ink-2 max-w-[420px] text-balance">
              Personne encore. La première place au générique est libre.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {supporters.map((s) => (
              <SupporterCard key={s.userId} supporter={s} />
            ))}
          </div>
        )}
      </section>

      <section className="px-10 py-12 border-b border-line flex flex-col items-center text-center max-md:px-5">
        <p className="font-mono text-[11px] leading-[1.7] tracking-[0.04em] text-ink-3 max-w-[560px] text-balance">
          Contrepartie d&apos;un don : badge Supporter, emotes perso dans le chat,
          couleur et police du pseudo, nom sur cette page. Rien qui touche au flux
          ni aux suggestions. Pour le badge automatique, paie avec ton pseudo club
          ciné ou l&apos;email de ton compte.
        </p>
      </section>

      <Footer className="mt-auto" />
    </div>
  );
}
