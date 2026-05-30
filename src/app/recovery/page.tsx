"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Brand from "@/components/Brand";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export default function RecoveryPage() {
  const { updatePassword } = useAuth();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
        setChecking(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) setReady(true);
      setChecking(false);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("mot de passe trop court (6 caractères min)");
      return;
    }
    if (password !== confirm) {
      setError("les deux mots de passe ne correspondent pas");
      return;
    }
    setSubmitting(true);
    const err = await updatePassword(password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 gap-8">
      <Brand href="/" sealSize={30} fontSize={20} />
      <div className="border border-line bg-bg max-w-xs w-full p-6">
        <div className="text-[14px] font-semibold uppercase tracking-[0.16em] mb-5">
          Nouveau mot de passe
        </div>

        {done ? (
          <>
            <p className="text-[13px] text-ink-2 leading-relaxed mb-5 text-balance">
              Mot de passe mis à jour. Tu peux retourner au direct.
            </p>
            <Link
              href="/movie"
              className="block text-center w-full border border-ink bg-transparent text-ink text-[12px] font-semibold py-2.5 hover:border-red hover:text-red transition-colors uppercase tracking-[0.12em]"
            >
              Accéder au direct
            </Link>
          </>
        ) : checking ? (
          <p className="text-[12px] text-ink-3">Vérification du lien…</p>
        ) : !ready ? (
          <>
            <p className="text-[13px] text-ink-2 leading-relaxed mb-5 text-balance">
              Lien invalide ou expiré. Relance une demande de réinitialisation depuis la connexion.
            </p>
            <Link
              href="/"
              className="block text-center w-full border border-ink bg-transparent text-ink text-[12px] font-semibold py-2.5 hover:border-red hover:text-red transition-colors uppercase tracking-[0.12em]"
            >
              Retour à l&apos;accueil
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="text-[11px] text-red border border-red/30 bg-red/5 px-2.5 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="text-[11px] text-ink-2 block mb-1.5 uppercase tracking-[0.04em]">
                mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-transparent border border-line-2 px-2.5 py-2 text-[13px] text-ink outline-none focus:border-ink transition-colors"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-ink-2 block mb-1.5 uppercase tracking-[0.04em]">
                confirme le mot de passe
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-transparent border border-line-2 px-2.5 py-2 text-[13px] text-ink outline-none focus:border-ink transition-colors"
                minLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full border border-ink bg-transparent text-ink text-[12px] font-semibold py-2.5 hover:border-red hover:text-red cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-default uppercase tracking-[0.12em]"
            >
              {submitting ? "…" : "Mettre à jour"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
