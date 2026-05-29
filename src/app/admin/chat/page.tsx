"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useChatSettings } from "@/lib/use-chat-settings";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import AdminCrossNav from "@/components/AdminCrossNav";

interface BannedProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  chat_banned_until: string;
  chat_ban_reason: string | null;
}

const SLOW_OPTIONS = [0, 5, 10, 20, 30, 60];

function formatBanExpiry(iso: string): string {
  const d = new Date(iso);
  if (d.getFullYear() >= 2100) return "perma";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChatAdminContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const { frozen, slowModeSeconds, loading: settingsLoading } = useChatSettings();
  const [bans, setBans] = useState<BannedProfile[]>([]);
  const [bansLoading, setBansLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isStaff = profile?.role === "admin" || profile?.role === "moderateur";
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    const load = async () => {
      const { data, error: err } = await supabase
        .from("profiles")
        .select("user_id,username,avatar_url,role,chat_banned_until,chat_ban_reason")
        .gt("chat_banned_until", new Date().toISOString())
        .order("chat_banned_until", { ascending: true });
      if (cancelled) return;
      if (err) console.error("[admin/chat] load bans error:", err);
      setBans((data ?? []) as BannedProfile[]);
      setBansLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  const toggleFreeze = async () => {
    setBusy("freeze");
    setError(null);
    const { error: rpcError } = await supabase.rpc("chat_set_settings", {
      p_frozen: !frozen,
      p_slow_mode_seconds: slowModeSeconds,
    });
    setBusy(null);
    if (rpcError) setError(rpcError.message);
  };

  const setSlowMode = async (seconds: number) => {
    setBusy(`slow-${seconds}`);
    setError(null);
    const { error: rpcError } = await supabase.rpc("chat_set_settings", {
      p_frozen: frozen,
      p_slow_mode_seconds: seconds,
    });
    setBusy(null);
    if (rpcError) setError(rpcError.message);
  };

  const liftBan = async (target: BannedProfile) => {
    setBusy(`unban-${target.user_id}`);
    setError(null);
    const { error: rpcError } = await supabase.rpc("chat_ban_user", {
      p_user_id: target.user_id,
      p_until: null,
      p_reason: null,
    });
    setBusy(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setBans((prev) => prev.filter((b) => b.user_id !== target.user_id));
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

  if (!user || !isStaff) {
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
            Réservé à la modération
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
          ★ <span className="text-red font-bold">Modération</span> · Chat live
        </div>
        <h1
          className="font-bold leading-[0.95] tracking-[-0.04em] text-balance"
          style={{ fontSize: "clamp(40px, 5vw, 72px)" }}
        >
          Chat
        </h1>
        <p className="text-[14px] leading-[1.6] text-ink-2 max-w-[560px] mt-3 text-balance">
          Gel d&apos;urgence, slow mode global et bans actifs. Les admins et modérateurs gardent l&apos;accès au chat même en gel.
        </p>
        {isAdmin && (
          <div className="mt-4">
            <AdminCrossNav current="/admin/chat" />
          </div>
        )}
      </header>

      <main className="px-10 py-10 max-md:px-5 flex flex-col gap-10">
        {error && (
          <div className="px-3 py-2 border border-red bg-red/10 text-[12px] text-red font-mono leading-[1.4] break-words rounded-md">
            ✕ {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="float-right text-red hover:text-ink text-[14px] cursor-pointer leading-none ml-2"
              aria-label="fermer"
            >
              ×
            </button>
          </div>
        )}

        <section className="flex flex-col gap-5">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3 text-balance">
            ★ État du chat
          </h2>

          <div className="border border-line rounded-md p-6 flex flex-col gap-6 bg-surface">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 mb-1">
                  Gel du chat
                </div>
                <div className="text-[13px] text-ink-2 max-w-md leading-[1.5]">
                  Bloque tous les nouveaux messages. À utiliser en cas de raid.
                </div>
              </div>
              <button
                type="button"
                onClick={toggleFreeze}
                disabled={busy === "freeze" || settingsLoading}
                className={`px-5 py-2.5 border font-semibold text-[12px] uppercase tracking-[0.12em] cursor-pointer transition-colors disabled:opacity-50 min-w-[120px] ${
                  frozen
                    ? "border-red bg-red/10 text-red hover:bg-red hover:text-bg"
                    : "border-line-2 text-ink-2 hover:border-ink hover:text-ink"
                }`}
              >
                {busy === "freeze" ? "…" : frozen ? "Dégeler" : "Geler"}
              </button>
            </div>

            <div>
              <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 mb-2">
                Slow mode (secondes entre deux messages)
              </div>
              <div className="grid grid-cols-6 gap-2 max-md:grid-cols-3">
                {SLOW_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSlowMode(sec)}
                    disabled={busy === `slow-${sec}` || settingsLoading}
                    className={`border px-3 py-2 text-[12px] font-mono uppercase tracking-[0.08em] cursor-pointer transition-colors disabled:opacity-50 ${
                      slowModeSeconds === sec
                        ? "border-red text-red"
                        : "border-line-2 text-ink-2 hover:border-ink hover:text-ink"
                    }`}
                  >
                    {sec === 0 ? "off" : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3 text-balance">
              ★ Bans actifs
            </h2>
            <span className="font-mono text-[11px] text-ink-3">
              {bansLoading ? "…" : `${bans.length} compte${bans.length > 1 ? "s" : ""}`}
            </span>
          </div>

          {bansLoading ? (
            <div className="font-mono text-[11px] text-ink-3">Chargement…</div>
          ) : bans.length === 0 ? (
            <div className="font-mono text-[11px] text-ink-3">aucun ban actif</div>
          ) : (
            <ul className="flex flex-col">
              {bans.map((b) => (
                <li
                  key={b.user_id}
                  className="border-t border-line first:border-t-0 py-3 flex items-center gap-3 flex-wrap"
                >
                  <div className="flex-1 min-w-[200px]">
                    <Link
                      href={`/u/${encodeURIComponent(b.username)}`}
                      className="font-semibold text-[14px] text-ink hover:text-red transition-colors"
                    >
                      @{b.username}
                    </Link>
                    {b.chat_ban_reason && (
                      <p className="text-[12px] leading-[1.5] text-ink-2 mt-1">
                        {b.chat_ban_reason}
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-ink-3 shrink-0">
                    jusqu&apos;au {formatBanExpiry(b.chat_banned_until)}
                  </span>
                  <button
                    type="button"
                    onClick={() => liftBan(b)}
                    disabled={busy === `unban-${b.user_id}`}
                    className="px-3 py-1.5 border border-line-2 text-[11px] text-ink-2 hover:text-ink hover:border-ink cursor-pointer transition-colors disabled:opacity-50 font-mono uppercase tracking-[0.08em]"
                  >
                    {busy === `unban-${b.user_id}` ? "…" : "Lever"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
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

export default function ChatAdminPage() {
  return <ChatAdminContent />;
}
