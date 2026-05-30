"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

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

const KIND_LABELS: Record<Kind | "all", string> = { all: "Tous", film: "Films", soiree: "Soirées" };
const STATUS_LABELS: Record<Status | "all", string> = { all: "Tous", pending: "En attente", accepted: "Acceptées", rejected: "Rejetées" };

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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
          <img src={poster} alt="" className="w-10 h-[60px] object-cover border border-line shrink-0" />
        )}
        <div className="flex flex-col gap-1 min-w-0">
          {title && <span className="text-[14px] font-semibold text-ink">{title}</span>}
          <a href={letterboxd} target="_blank" rel="noopener noreferrer"
            className="text-[12px] text-ink-2 hover:text-red transition-colors break-all">
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
      try {
        let query = supabase.from("suggestions").select("id,kind,user_id,username,payload,credit,status,created_at").order("created_at", { ascending: false }).limit(200);
        if (kindFilter !== "all") query = query.eq("kind", kindFilter);
        if (statusFilter !== "all") query = query.eq("status", statusFilter);
        const { data } = await query;
        if (cancelled) return;
        setItems((data ?? []) as Suggestion[]);
      } catch (e) {
        console.error("[admin/suggestions] load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isAdmin, kindFilter, statusFilter]);

  const updateStatus = async (id: string, next: Status) => {
    setUpdating(id);
    const { error } = await supabase.from("suggestions").update({ status: next }).eq("id", id);
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
    return <div className="px-10 py-20 font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase">Chargement…</div>;
  }

  if (!user || !isAdmin) {
    return (
      <div className="px-10 py-32 flex flex-col items-center gap-6 text-center">
        <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red">★ Accès refusé</div>
        <h1 className="font-bold leading-[0.95] tracking-[-0.04em] text-balance" style={{ fontSize: "clamp(40px, 6vw, 72px)" }}>Réservé aux admins</h1>
        <Link href="/" className="inline-flex items-center gap-3 px-5 py-3 border border-ink text-ink font-semibold text-[12px] tracking-wide hover:border-red hover:text-red transition-colors">RETOUR <span aria-hidden>→</span></Link>
      </div>
    );
  }

  return (
    <>
      <header className="px-10 py-8 border-b border-line max-md:px-5 max-md:py-6">
        <h1 className="font-mono text-[11px] font-bold tracking-[0.16em] uppercase text-ink mb-1">Suggestions</h1>
        <p className="text-[13px] text-ink-3">Propositions de films et de soirées envoyées depuis le site.</p>
      </header>

      <div className="px-10 py-4 border-b border-line flex flex-wrap items-center gap-5 max-md:px-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Type</span>
          {(["all", "film", "soiree"] as const).map((k) => (
            <button key={k} onClick={() => setKindFilter(k)}
              className={`px-3 py-1.5 text-[11px] font-mono tracking-[0.08em] uppercase border transition-colors cursor-pointer ${kindFilter === k ? "border-ink text-ink" : "border-line-2 text-ink-3 hover:text-ink"}`}>
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Statut</span>
          {(["all", "pending", "accepted", "rejected"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-[11px] font-mono tracking-[0.08em] uppercase border transition-colors cursor-pointer ${statusFilter === s ? "border-ink text-ink" : "border-line-2 text-ink-3 hover:text-ink"}`}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="ml-auto font-mono text-[11px] tracking-[0.04em] text-ink-3">
          {loading ? "…" : `${items.length} item${items.length > 1 ? "s" : ""}`}
        </div>
      </div>

      <main className="px-10 py-6 max-md:px-5">
        {loading ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-12 text-center">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-16 text-center">★ Boîte vide</div>
        ) : (
          <ul className="flex flex-col">
            {items.map((s) => (
              <li key={s.id} className="border-t border-line first:border-t-0 py-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex flex-col gap-0.5">
                    {s.username ? (
                      <Link href={`/u/${encodeURIComponent(s.username)}`} className="font-semibold text-[14px] text-ink hover:text-red transition-colors">
                        @{s.username}
                      </Link>
                    ) : (
                      <span className="font-semibold text-[14px] text-ink-3">anonyme</span>
                    )}
                    <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.04em] text-ink-3 flex-wrap">
                      <span>{formatDate(s.created_at)}</span>
                      <span className="text-ink-4">·</span>
                      <span className="uppercase">{s.kind}</span>
                      {s.credit && <><span className="text-ink-4">·</span><span className="text-red">★ avec attribution</span></>}
                      <span className="text-ink-4">·</span>
                      <span className={s.status === "pending" ? "text-red font-semibold" : s.status === "accepted" ? "text-ink" : ""}>{STATUS_LABELS[s.status]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.status !== "accepted" && (
                      <button type="button" onClick={() => updateStatus(s.id, "accepted")} disabled={updating === s.id}
                        className="px-3 py-1.5 border border-ink text-ink font-semibold text-[11px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30">
                        Accepter
                      </button>
                    )}
                    {s.status !== "rejected" && (
                      <button type="button" onClick={() => updateStatus(s.id, "rejected")} disabled={updating === s.id}
                        className="px-3 py-1.5 border border-line-2 text-ink-3 font-semibold text-[11px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30">
                        Rejeter
                      </button>
                    )}
                    {s.status !== "pending" && (
                      <button type="button" onClick={() => updateStatus(s.id, "pending")} disabled={updating === s.id}
                        className="px-3 py-1.5 border border-line-2 text-ink-3 font-semibold text-[11px] uppercase tracking-[0.08em] hover:text-ink hover:border-ink transition-colors cursor-pointer disabled:opacity-30">
                        Rouvrir
                      </button>
                    )}
                  </div>
                </div>
                <PayloadView kind={s.kind} payload={s.payload} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

export default function SuggestionsAdminPage() {
  return <SuggestionsAdminContent />;
}
