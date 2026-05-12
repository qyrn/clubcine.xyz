"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useEscapeKey } from "@/lib/use-escape-key";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { supabase } from "@/lib/supabase";

export default function BugReportButton({ inline = false }: { inline?: boolean }) {
  const { user, username } = useAuth();
  const [open, setOpen] = useState(false);
  useEscapeKey(() => setOpen(false), open);
  useBodyScrollLock(open);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "sent") return;
    const t = setTimeout(() => {
      setStatus("idle");
      setOpen(false);
    }, 1800);
    return () => clearTimeout(t);
  }, [status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    setErrMsg(null);
    try {
      const { error } = await supabase.from("bug_reports").insert({
        user_id: user?.id ?? null,
        username: username ?? null,
        message: message.trim(),
        page_url: typeof window !== "undefined" ? window.location.href : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
      if (error) {
        setStatus("error");
        setErrMsg(error.message);
        return;
      }
      setMessage("");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={
        inline
          ? "font-mono text-[11px] tracking-[0.04em] uppercase text-ink-3 hover:text-red transition-colors cursor-pointer"
          : "font-mono text-[11px] tracking-[0.04em] uppercase text-ink-3 hover:text-red transition-colors cursor-pointer"
      }
    >
      Signaler un bug
    </button>
  );

  return (
    <>
      {trigger}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="border border-line bg-bg max-w-md w-full p-6 rounded-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-red">
                [ Signaler un bug ]
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-ink-3 hover:text-ink text-[12px] cursor-pointer transition-colors"
              >
                fermer
              </button>
            </div>

            <p className="text-[12px] leading-[1.6] text-ink-2 mb-4">
              Décris ce qui ne va pas. Si on accepte le rapport, tu gagnes
              automatiquement le badge <span className="text-red">Bug hunter</span>.
            </p>

            <form onSubmit={submit} className="flex flex-col gap-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Le player a planté à 22h41 sur Sonatine, l'image est figée mais le son continue…"
                className="bg-transparent border border-line-2 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink rounded-md resize-none"
                required
              />
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] text-ink-3 tracking-[0.04em]">
                  {message.length}/1000 · URL et user-agent capturés auto
                </span>
                <button
                  type="submit"
                  disabled={!message.trim() || submitting}
                  className="px-4 py-2 border border-ink text-ink font-semibold text-[11px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30 rounded-md"
                >
                  {submitting ? "…" : "Envoyer"}
                </button>
              </div>

              {status === "sent" && (
                <div className="font-mono text-[11px] text-red tracking-[0.04em]">
                  ★ Bug envoyé, merci. Fenêtre se ferme…
                </div>
              )}
              {status === "error" && errMsg && (
                <div className="font-mono text-[11px] text-red tracking-[0.04em]">
                  ✕ {errMsg}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
