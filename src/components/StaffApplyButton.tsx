"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useEscapeKey } from "@/lib/use-escape-key";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { supabase } from "@/lib/supabase";

interface Props {
  className?: string;
  label?: string;
}

export default function StaffApplyButton({ className, label = "Rejoindre l'équipe" }: Props) {
  const { user, profile, username } = useAuth();
  const [open, setOpen] = useState(false);
  useEscapeKey(() => setOpen(false), open);
  useBodyScrollLock(open);
  const [motivation, setMotivation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const alreadyStaff =
    profile?.role === "moderateur" || profile?.role === "admin";

  useEffect(() => {
    if (status !== "sent") return;
    const t = setTimeout(() => {
      setStatus("idle");
      setOpen(false);
      setMotivation("");
    }, 2200);
    return () => clearTimeout(t);
  }, [status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = motivation.trim();
    if (trimmed.length < 30) {
      setStatus("error");
      setErrMsg("au moins 30 caractères");
      return;
    }
    if (!user || !username) {
      setStatus("error");
      setErrMsg("connecte-toi d'abord");
      return;
    }
    setSubmitting(true);
    setErrMsg(null);
    try {
      const { error } = await supabase.from("staff_applications").insert({
        user_id: user.id,
        username,
        role_wanted: "moderateur",
        motivation: trimmed,
      });
      if (error) {
        setStatus("error");
        setErrMsg(error.message);
        return;
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-3 px-6 py-4 border border-ink bg-transparent text-ink font-semibold text-[13px] tracking-wide transition-colors hover:border-red hover:text-red cursor-pointer rounded-md"
        }
      >
        {label}
        <span aria-hidden>→</span>
      </button>

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
                [ Rejoindre l&apos;équipe ]
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-ink-3 hover:text-ink text-[12px] cursor-pointer transition-colors"
              >
                fermer
              </button>
            </div>

            {!user ? (
              <p className="text-[13px] leading-[1.6] text-ink-2 text-balance">
                Connecte-toi pour postuler. La candidature est rattachée à ton
                compte pour qu&apos;on puisse te promouvoir si elle est acceptée.
              </p>
            ) : alreadyStaff ? (
              <p className="text-[13px] leading-[1.6] text-ink-2 text-balance">
                Tu fais déjà partie de l&apos;équipe (
                <span className="text-red">{profile?.role}</span>). Merci d&apos;être là.
              </p>
            ) : (
              <>
                <p className="text-[12px] leading-[1.6] text-ink-2 mb-4 text-balance">
                  On cherche des modérateurs pour le chat. Raconte-nous pourquoi
                  tu veux aider : ce que tu regardes, ce qui te tient à coeur,
                  combien de temps tu peux y mettre.
                </p>

                <form onSubmit={submit} className="flex flex-col gap-3">
                  <textarea
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    rows={7}
                    maxLength={1500}
                    placeholder="Je suis sur le chat presque tous les soirs, je connais le catalogue, j'ai déjà modéré sur Discord pendant 2 ans…"
                    className="bg-transparent border border-line-2 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink rounded-md resize-none"
                    required
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] text-ink-3 tracking-[0.04em]">
                      {motivation.length}/1500 · min 30
                    </span>
                    <button
                      type="submit"
                      disabled={motivation.trim().length < 30 || submitting}
                      className="px-4 py-2 border border-ink text-ink font-semibold text-[11px] uppercase tracking-[0.08em] hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30 rounded-md"
                    >
                      {submitting ? "…" : "Envoyer"}
                    </button>
                  </div>

                  {status === "sent" && (
                    <div className="font-mono text-[11px] text-red tracking-[0.04em]">
                      ★ Candidature envoyée. On revient vers toi.
                    </div>
                  )}
                  {status === "error" && errMsg && (
                    <div className="font-mono text-[11px] text-red tracking-[0.04em]">
                      ✕ {errMsg}
                    </div>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
