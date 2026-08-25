"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdminGuard } from "@/lib/use-admin-guard";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Status = "pending" | "accepted" | "rejected";

interface Application {
  id: string;
  user_id: string;
  username: string;
  role_wanted: string;
  motivation: string;
  status: Status;
  created_at: string;
}

const STATUS_LABELS: Record<Status | "all", string> = { all: "Toutes", pending: "En attente", accepted: "Acceptées", rejected: "Rejetées" };

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function StaffAdminContent() {
  const { authLoading, allowed } = useAdminGuard();
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("pending");
  const [updating, setUpdating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase.from("staff_applications").select("id,user_id,username,role_wanted,motivation,status,created_at").order("created_at", { ascending: false }).limit(200);
        if (statusFilter !== "all") query = query.eq("status", statusFilter);
        const { data } = await query;
        if (cancelled) return;
        setItems((data ?? []) as Application[]);
      } catch (e) {
        console.error("[admin/staff] load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [allowed, statusFilter]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(t);
  }, [feedback]);

  const updateStatus = async (app: Application, next: Status) => {
    setUpdating(app.id);
    const { error: statusErr } = await supabase.from("staff_applications").update({ status: next }).eq("id", app.id);
    if (statusErr) { setUpdating(null); setFeedback({ kind: "err", text: statusErr.message }); return; }

    if (next === "accepted") {
      const { error: roleErr } = await supabase.rpc("admin_set_role", { p_user_id: app.user_id, p_role: app.role_wanted });
      if (roleErr) {
        setUpdating(null);
        setFeedback({ kind: "err", text: `Statut OK, promotion échouée : ${roleErr.message}` });
      } else {
        setFeedback({ kind: "ok", text: `@${app.username} promu ${app.role_wanted}` });
      }
    } else {
      setFeedback({ kind: "ok", text: `Statut → ${next}` });
    }

    setUpdating(null);
    setItems((prev) =>
      statusFilter === "all" || statusFilter === next
        ? prev.map((s) => (s.id === app.id ? { ...s, status: next } : s))
        : prev.filter((s) => s.id !== app.id)
    );
  };

  return (
    <AdminGuard authLoading={authLoading} allowed={allowed}>
      <header className="px-10 py-8 border-b border-line max-md:px-5 max-md:py-6">
        <h1 className="font-mono text-[11px] font-bold tracking-[0.16em] uppercase text-ink mb-1">Candidatures staff</h1>
        <p className="text-[13px] text-ink-3">Accepter promeut automatiquement le user au rôle demandé.</p>
      </header>

      <div className="px-10 py-4 border-b border-line flex flex-wrap items-center gap-3 max-md:px-5">
        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Statut</span>
        {(["all", "pending", "accepted", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-[11px] font-mono tracking-[0.08em] uppercase border transition-colors cursor-pointer ${statusFilter === s ? "border-ink text-ink" : "border-line-2 text-ink-3 hover:text-ink"}`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
        <div className="ml-auto font-mono text-[11px] tracking-[0.04em] text-ink-3">
          {loading ? "…" : `${items.length} item${items.length > 1 ? "s" : ""}`}
        </div>
        {feedback && (
          <div className={`font-mono text-[11px] tracking-[0.04em] basis-full ${feedback.kind === "ok" ? "text-ink" : "text-red"}`}>
            {feedback.kind === "ok" ? "★" : "✕"} {feedback.text}
          </div>
        )}
      </div>

      <main className="px-10 py-6 max-md:px-5">
        {loading ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-12 text-center">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-16 text-center">★ Boîte vide</div>
        ) : (
          <ul className="flex flex-col">
            {items.map((a) => (
              <li key={a.id} className="border-t border-line first:border-t-0 py-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex flex-col gap-0.5">
                    <Link href={`/u/${encodeURIComponent(a.username)}`} className="font-semibold text-[14px] text-ink hover:text-red transition-colors">
                      @{a.username}
                    </Link>
                    <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.04em] text-ink-3 flex-wrap">
                      <span>{formatDate(a.created_at)}</span>
                      <span className="text-ink-4">·</span>
                      <span>vise {a.role_wanted}</span>
                      <span className="text-ink-4">·</span>
                      <span className={a.status === "pending" ? "text-red font-semibold" : a.status === "accepted" ? "text-ink" : ""}>{STATUS_LABELS[a.status]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.status !== "accepted" && (
                      <button type="button" onClick={() => updateStatus(a, "accepted")} disabled={updating === a.id}
                        className="px-3 py-1.5 border border-ink text-ink font-semibold text-[11px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30">
                        Accepter + promouvoir
                      </button>
                    )}
                    {a.status !== "rejected" && (
                      <button type="button" onClick={() => updateStatus(a, "rejected")} disabled={updating === a.id}
                        className="px-3 py-1.5 border border-line-2 text-ink-3 font-semibold text-[11px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30">
                        Rejeter
                      </button>
                    )}
                    {a.status !== "pending" && (
                      <button type="button" onClick={() => updateStatus(a, "pending")} disabled={updating === a.id}
                        className="px-3 py-1.5 border border-line-2 text-ink-3 font-semibold text-[11px] uppercase tracking-[0.08em] hover:text-ink hover:border-ink transition-colors cursor-pointer disabled:opacity-30">
                        Rouvrir
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[13px] leading-[1.6] text-ink-2 whitespace-pre-wrap break-words">
                  {a.motivation}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AdminGuard>
  );
}

export default function StaffAdminPage() {
  return <StaffAdminContent />;
}
