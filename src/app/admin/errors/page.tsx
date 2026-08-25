"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAdminGuard } from "@/lib/use-admin-guard";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Range = "1h" | "24h" | "7d" | "30d" | "all";

interface ErrorRow {
  id: string;
  created_at: string;
  source: string;
  message: string;
  stack: string | null;
  url: string | null;
  user_agent: string | null;
  user_id: string | null;
  username: string | null;
}

const RANGE_LABELS: Record<Range, string> = { "1h": "1 h", "24h": "24 h", "7d": "7 j", "30d": "30 j", all: "Tout" };
const RANGE_MS: Record<Exclude<Range, "all">, number> = { "1h": 3600000, "24h": 86400000, "7d": 604800000, "30d": 2592000000 };

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function shortAgent(ua: string | null): string {
  if (!ua) return "·";
  const m = ua.match(/(Firefox|Chrome|Safari|Edg|OPR)\/(\d+)/);
  if (!m) return ua.slice(0, 40);
  return `${m[1]} ${m[2]}`;
}

function ErrorsAdminContent() {
  const { authLoading, allowed } = useAdminGuard();

  const [items, setItems] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("24h");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [authedOnly, setAuthedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase.from("error_log").select("id,created_at,source,message,stack,url,user_agent,user_id,username").order("created_at", { ascending: false }).limit(500);
        if (range !== "all") {
          const since = new Date(Date.now() - RANGE_MS[range]).toISOString();
          query = query.gte("created_at", since);
        }
        const { data, error } = await query;
        if (cancelled) return;
        if (error) console.error("[admin/errors] load error:", error);
        setItems((data ?? []) as ErrorRow[]);
      } catch (e) {
        console.error("[admin/errors] load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [allowed, range]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const e of items) set.add(e.source);
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((e) => {
      if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
      if (authedOnly && !e.user_id) return false;
      if (needle) {
        const hay = `${e.message} ${e.stack ?? ""} ${e.url ?? ""} ${e.username ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [items, sourceFilter, authedOnly, search]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const e of items) buckets.set(e.source, (buckets.get(e.source) ?? 0) + 1);
    return Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  return (
    <AdminGuard authLoading={authLoading} allowed={allowed}>
      <header className="px-10 py-8 border-b border-line max-md:px-5 max-md:py-6">
        <h1 className="font-mono text-[11px] font-bold tracking-[0.16em] uppercase text-ink mb-1">Erreurs runtime</h1>
        <p className="text-[13px] text-ink-3">Capturées côté client via ErrorBoundary + reportError. Table <span className="text-red font-mono">error_log</span>, rate-limit 30/10min.</p>
      </header>

      <div className="px-10 py-4 border-b border-line flex flex-col gap-3 max-md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 mr-1">Période</span>
          {(["1h", "24h", "7d", "30d", "all"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-[11px] font-mono tracking-[0.08em] uppercase border transition-colors cursor-pointer ${range === r ? "border-ink text-ink" : "border-line-2 text-ink-3 hover:text-ink"}`}>
              {RANGE_LABELS[r]}
            </button>
          ))}
          <span className="ml-auto font-mono text-[11px] tracking-[0.04em] text-ink-3">
            {loading ? "…" : `${filtered.length} / ${items.length}`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 mr-1">Source</span>
          <button onClick={() => setSourceFilter("all")}
            className={`px-3 py-1.5 text-[11px] font-mono tracking-[0.08em] uppercase border transition-colors cursor-pointer ${sourceFilter === "all" ? "border-ink text-ink" : "border-line-2 text-ink-3 hover:text-ink"}`}>
            Toutes
          </button>
          {sources.map((s) => {
            const count = grouped.find((g) => g[0] === s)?.[1] ?? 0;
            return (
              <button key={s} onClick={() => setSourceFilter(s)}
                className={`px-3 py-1.5 text-[11px] font-mono tracking-[0.08em] lowercase border transition-colors cursor-pointer ${sourceFilter === s ? "border-ink text-ink" : "border-line-2 text-ink-3 hover:text-ink"}`}>
                {s} <span className="text-ink-3">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="filtrer message, stack, url, user..."
            className="flex-1 min-w-[240px] bg-bg border border-line-2 px-3 py-2 text-[12px] text-ink placeholder:text-ink-3 focus:border-ink outline-none transition-colors"
          />
          <label className="flex items-center gap-2 font-mono text-[11px] tracking-[0.04em] text-ink-3 cursor-pointer select-none">
            <input type="checkbox" checked={authedOnly} onChange={(e) => setAuthedOnly(e.target.checked)} className="accent-red cursor-pointer" />
            Authentifiés uniquement
          </label>
        </div>
      </div>

      <main className="px-10 py-6 max-md:px-5">
        {loading ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-12 text-center">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase py-16 text-center">★ Aucune erreur</div>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((e) => {
              const open = openId === e.id;
              return (
                <li key={e.id} className="border-t border-line first:border-t-0 py-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex flex-col gap-0.5">
                      {e.username ? (
                        <Link href={`/u/${encodeURIComponent(e.username)}`} className="font-semibold text-[13px] text-ink hover:text-red transition-colors">
                          @{e.username}
                        </Link>
                      ) : (
                        <span className="font-mono text-[12px] text-ink-3">anonyme</span>
                      )}
                      <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.04em] text-ink-3 flex-wrap">
                        <span>{formatDate(e.created_at)}</span>
                        <span className="text-ink-4">·</span>
                        <span className="uppercase text-red">{e.source}</span>
                        <span className="text-ink-4">·</span>
                        <span>{shortAgent(e.user_agent)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[13px] leading-[1.5] text-ink whitespace-pre-wrap break-words">
                    {e.message || <span className="text-ink-3">(sans message)</span>}
                  </p>
                  {e.url && (
                    <a href={e.url} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-[10px] tracking-[0.04em] text-ink-3 hover:text-red transition-colors break-all self-start">
                      {e.url}
                    </a>
                  )}
                  {e.stack && (
                    <>
                      <button type="button" onClick={() => setOpenId(open ? null : e.id)}
                        className="self-start font-mono text-[10px] tracking-[0.08em] uppercase text-ink-3 hover:text-red transition-colors cursor-pointer">
                        {open ? "Masquer stack" : "Voir stack"}
                      </button>
                      {open && (
                        <pre className="font-mono text-[10px] leading-[1.5] text-ink-2 border border-line-2 p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-[400px]">
                          {e.stack}
                        </pre>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </AdminGuard>
  );
}

export default function ErrorsAdminPage() {
  return <ErrorsAdminContent />;
}
