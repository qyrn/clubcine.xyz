"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";

type Kind = "film" | "soiree";
type Status = "pending" | "accepted" | "rejected";

interface Suggestion {
  id: string;
  kind: Kind;
  user_id: string | null;
  username: string | null;
  payload: Record<string, unknown>;
  credit: boolean;
  status: Status;
  created_at: string;
}

const KIND_LABELS: Record<Kind | "all", string> = {
  all: "Tous",
  film: "Films",
  soiree: "Soirées",
};

const STATUS_LABELS: Record<Status | "all", string> = {
  all: "Tous",
  pending: "En attente",
  accepted: "Acceptées",
  rejected: "Rejetées",
};

const STATUS_COLORS: Record<Status, string> = {
  pending: "text-red",
  accepted: "text-ink",
  rejected: "text-ink-4",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PayloadView({ kind, payload }: { kind: Kind; payload: Record<string, unknown> }) {
  if (kind === "film") {
    const letterboxd = String(payload.letterboxd ?? "");
    const poster = payload.poster ? String(payload.poster) : null;
    const title = payload.title ? String(payload.title) : null;
    return (
      <div className="flex gap-3 items-start">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="w-12 h-[72px] object-cover border border-line rounded-md shrink-0"
          />
        )}
        <div className="flex flex-col gap-1 min-w-0">
          {title && (
            <span className="text-[14px] font-semibold text-ink">{title}</span>
          )}
          <a
            href={letterboxd}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-ink-2 hover:text-red transition-colors break-all"
          >
            {letterboxd}
          </a>
        </div>
      </div>
    );
  }
  const theme = String(payload.theme ?? "");
  const films = String(payload.films ?? "");
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[14px] font-semibold text-ink">{theme}</span>
      <span className="text-[12px] text-ink-2 leading-[1.5] whitespace-pre-wrap">{films}</span>
    </div>
  );
}

function SuggestionsAdminContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<Kind | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("pending");
  const [updating, setUpdating] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from("suggestions")
        .select("id,kind,user_id,username,payload,credit,status,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (kindFilter !== "all") query = query.eq("kind", kindFilter);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data } = await query;
      if (cancelled) return;
      setItems((data ?? []) as Suggestion[]);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, kindFilter, statusFilter]);

  const updateStatus = async (id: string, next: Status) => {
    setUpdating(id);
    const { error } = await supabase
      .from("suggestions")
      .update({ status: next })
      .eq("id", id);
    setUpdating(null);
    if (!error) {
      setItems((prev) =>
        statusFilter === "all" || statusFilter === next
          ? prev.map((s) => (s.id === id ? { ...s, status: next } : s))
          : prev.filter((s) => s.id !== id)
      );
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
          <p className="text-[14px] text-ink-2 max-w-[420px]">
            Cette page est protégée. Connecte-toi avec un compte qui a le rôle
            <span className="font-mono text-ink"> admin </span> dans Supabase.
          </p>
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
          Suggestions
        </h1>
        <p className="text-[14px] leading-[1.6] text-ink-2 max-w-[560px] mt-3">
          Boîte de réception des propositions de films et de soirées envoyées
          depuis le site.
        </p>
        <div className="mt-4 flex items-center gap-4 flex-wrap">
          <Link href="/admin/dashboard" className="text-[12px] font-mono uppercase tracking-[0.16em] text-red font-bold hover:text-ink transition-colors">★ dashboard</Link>
          <Link href="/admin/users" className="text-[12px] font-mono uppercase tracking-[0.16em] text-ink-3 hover:text-red transition-colors">→ users</Link>
          <Link href="/admin/bugs" className="text-[12px] font-mono uppercase tracking-[0.16em] text-ink-3 hover:text-red transition-colors">→ bugs</Link>
          <Link href="/admin/emotes" className="text-[12px] font-mono uppercase tracking-[0.16em] text-ink-3 hover:text-red transition-colors">→ emotes</Link>
          <Link href="/admin/staff" className="text-[12px] font-mono uppercase tracking-[0.16em] text-ink-3 hover:text-red transition-colors">→ staff</Link>
        </div>
      </header>

      <div className="px-10 py-6 border-b border-line flex flex-wrap items-center gap-6 max-md:px-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Type</span>
          {(["all", "film", "soiree"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`px-3 py-1.5 text-[11px] font-mono tracking-[0.08em] uppercase border rounded-md transition-colors cursor-pointer ${
                kindFilter === k
                  ? "border-ink text-ink"
                  : "border-line-2 text-ink-3 hover:text-ink hover:border-line-2"
              }`}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Statut</span>
          {(["all", "pending", "accepted", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-[11px] font-mono tracking-[0.08em] uppercase border rounded-md transition-colors cursor-pointer ${
                statusFilter === s
                  ? "border-ink text-ink"
                  : "border-line-2 text-ink-3 hover:text-ink hover:border-line-2"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="ml-auto font-mono text-[11px] tracking-[0.04em] text-ink-3">
          {loading ? "…" : `${items.length} item${items.length > 1 ? "s" : ""}`}
        </div>
      </div>

      <main className="px-10 py-8 max-md:px-5">
        {loading ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-12 text-center">
            Chargement…
          </div>
        ) : items.length === 0 ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-16 text-center">
            ★ Boîte vide
          </div>
        ) : (
          <ul className="flex flex-col">
            {items.map((s) => (
              <li
                key={s.id}
                className="border-t border-line first:border-t-0 py-5 grid grid-cols-[100px_120px_1fr_auto] items-start gap-6 max-md:grid-cols-1 max-md:gap-3"
              >
                <div className="font-mono text-[10px] tracking-[0.16em] uppercase">
                  <div className={`${STATUS_COLORS[s.status]} font-semibold`}>
                    {STATUS_LABELS[s.status]}
                  </div>
                  <div className="text-ink-3 mt-1">{s.kind}</div>
                </div>

                <div className="font-mono text-[11px] tracking-[0.04em] text-ink-3">
                  <div>{formatDate(s.created_at)}</div>
                  {s.username ? (
                    <Link
                      href={`/u/${encodeURIComponent(s.username)}`}
                      className="text-ink-2 hover:text-red transition-colors"
                    >
                      @{s.username}
                    </Link>
                  ) : (
                    <span className="text-ink-4">anonyme</span>
                  )}
                  {s.credit && (
                    <div className="text-red mt-1">★ avec attribution</div>
                  )}
                </div>

                <div className="min-w-0">
                  <PayloadView kind={s.kind} payload={s.payload} />
                </div>

                <div className="flex items-center gap-2 shrink-0 max-md:flex-wrap">
                  {s.status !== "accepted" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(s.id, "accepted")}
                      disabled={updating === s.id}
                      className="px-3 py-1.5 border border-ink text-ink font-semibold text-[10px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30 rounded-md"
                    >
                      Accepter
                    </button>
                  )}
                  {s.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(s.id, "rejected")}
                      disabled={updating === s.id}
                      className="px-3 py-1.5 border border-line-2 text-ink-3 font-semibold text-[10px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30 rounded-md"
                    >
                      Rejeter
                    </button>
                  )}
                  {s.status !== "pending" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(s.id, "pending")}
                      disabled={updating === s.id}
                      className="px-3 py-1.5 border border-line-2 text-ink-4 font-semibold text-[10px] uppercase tracking-[0.08em] hover:text-ink hover:border-ink transition-colors cursor-pointer disabled:opacity-30 rounded-md"
                    >
                      Re-pending
                    </button>
                  )}
                </div>
              </li>
            ))}
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

export default function SuggestionsAdminPage() {
  return <SuggestionsAdminContent />;
}
