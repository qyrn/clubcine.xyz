"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import AdminCrossNav from "@/components/AdminCrossNav";

type Status = "pending" | "accepted" | "rejected";

interface BugReport {
  id: string;
  user_id: string | null;
  username: string | null;
  message: string;
  page_url: string | null;
  user_agent: string | null;
  status: Status;
  created_at: string;
}

const STATUS_LABELS: Record<Status | "all", string> = {
  all: "Tous",
  pending: "En attente",
  accepted: "Acceptés",
  rejected: "Rejetés",
};

const STATUS_COLORS: Record<Status, string> = {
  pending: "text-red",
  accepted: "text-ink",
  rejected: "text-ink-3",
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

function shortAgent(ua: string | null): string {
  if (!ua) return "–";
  const m = ua.match(/(Firefox|Chrome|Safari|Edg|OPR)\/(\d+)/);
  if (!m) return ua.slice(0, 40);
  return `${m[1]} ${m[2]}`;
}

function BugsAdminContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const [items, setItems] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("pending");
  const [updating, setUpdating] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("bug_reports")
          .select("id,user_id,username,message,page_url,user_agent,status,created_at")
          .order("created_at", { ascending: false })
          .limit(200);
        if (statusFilter !== "all") query = query.eq("status", statusFilter);
        const { data } = await query;
        if (cancelled) return;
        setItems((data ?? []) as BugReport[]);
      } catch (e) {
        console.error("[admin/bugs] load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, statusFilter]);

  const updateStatus = async (id: string, next: Status) => {
    setUpdating(id);
    const { error } = await supabase
      .from("bug_reports")
      .update({ status: next })
      .eq("id", id);
    setUpdating(null);
    if (error) return;
    setItems((prev) =>
      statusFilter === "all" || statusFilter === next
        ? prev.map((s) => (s.id === id ? { ...s, status: next } : s))
        : prev.filter((s) => s.id !== id)
    );
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
          Bugs
        </h1>
        <p className="text-[14px] leading-[1.6] text-ink-2 max-w-[560px] mt-3 text-balance">
          Rapports de bugs envoyés depuis le site. Accepter un bug attribue
          automatiquement le badge <span className="text-red">bug-hunter</span> à
          son auteur.
        </p>
        <div className="mt-4">
          <AdminCrossNav current="/admin/bugs" />
        </div>
      </header>

      <div className="px-10 py-6 border-b border-line flex flex-wrap items-center gap-4 max-md:px-5">
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
            {items.map((b) => (
              <li
                key={b.id}
                className="border-t border-line first:border-t-0 py-5 grid grid-cols-[110px_140px_1fr_auto] items-start gap-6 max-md:grid-cols-1 max-md:gap-3"
              >
                <div className="font-mono text-[10px] tracking-[0.16em] uppercase">
                  <div className={`${STATUS_COLORS[b.status]} font-semibold`}>
                    {STATUS_LABELS[b.status]}
                  </div>
                </div>

                <div className="font-mono text-[11px] tracking-[0.04em] text-ink-3 flex flex-col gap-0.5">
                  <span>{formatDate(b.created_at)}</span>
                  {b.username ? (
                    <Link
                      href={`/u/${encodeURIComponent(b.username)}`}
                      className="text-ink-2 hover:text-red transition-colors"
                    >
                      @{b.username}
                    </Link>
                  ) : (
                    <span className="text-ink-3">anonyme</span>
                  )}
                  <span className="text-ink-3">{shortAgent(b.user_agent)}</span>
                </div>

                <div className="min-w-0 flex flex-col gap-2">
                  <p className="text-[13px] leading-[1.6] text-ink whitespace-pre-wrap break-words">
                    {b.message}
                  </p>
                  {b.page_url && (
                    <a
                      href={b.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] tracking-[0.04em] text-ink-3 hover:text-red transition-colors break-all"
                    >
                      {b.page_url}
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 max-md:flex-wrap">
                  {b.status !== "accepted" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(b.id, "accepted")}
                      disabled={updating === b.id}
                      className="px-3 py-1.5 border border-ink text-ink font-semibold text-[10px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30 rounded-md"
                    >
                      Accepter
                    </button>
                  )}
                  {b.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(b.id, "rejected")}
                      disabled={updating === b.id}
                      className="px-3 py-1.5 border border-line-2 text-ink-3 font-semibold text-[10px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30 rounded-md"
                    >
                      Rejeter
                    </button>
                  )}
                  {b.status !== "pending" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(b.id, "pending")}
                      disabled={updating === b.id}
                      className="px-3 py-1.5 border border-line-2 text-ink-3 font-semibold text-[10px] uppercase tracking-[0.08em] hover:text-ink hover:border-ink transition-colors cursor-pointer disabled:opacity-30 rounded-md"
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

      <footer className="mt-auto px-10 py-6 flex justify-between items-center font-mono font-medium text-[11px] tracking-[0.04em] text-ink-3 max-md:px-5 max-md:py-4 max-md:flex-col max-md:gap-2">
        <span>CLUBCINE.XYZ · ADMIN · 2026</span>
        <Link href="/" className="hover:text-ink transition-colors">
          ← RETOUR
        </Link>
      </footer>
    </div>
  );
}

export default function BugsAdminPage() {
  return <BugsAdminContent />;
}
