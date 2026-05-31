"use client";

import { useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import Footer from "@/components/Footer";
import { RoleBadge } from "@/components/RoleBadge";
import { useAuth } from "@/lib/auth-context";

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-[11px] text-ink-2 block mb-1.5 uppercase tracking-[0.04em]">
        {label}
      </label>
      <input
        {...props}
        className="w-full bg-transparent border border-line-2 px-2.5 py-2 text-[13px] text-ink outline-none focus:border-ink transition-colors"
      />
    </div>
  );
}

function Feedback({ message }: { message: { kind: "ok" | "err"; text: string } | null }) {
  if (!message) return null;
  return (
    <div
      className={`text-[11px] px-2.5 py-2 border ${
        message.kind === "ok"
          ? "text-ink-2 border-line-2 bg-line/30"
          : "text-red border-red/30 bg-red/5"
      }`}
    >
      {message.text}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 py-2.5 border-t border-line first:border-t-0 first:pt-0">
      <dt className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 w-20 shrink-0">
        {label}
      </dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

function IdentityCard() {
  const { user, profile } = useAuth();
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div className="border border-line rounded-md p-5 flex flex-col gap-4">
      <div className="text-[14px] font-semibold uppercase tracking-[0.16em]">Identité</div>
      <dl className="flex flex-col">
        <InfoRow label="Email">
          <span className="font-mono text-[12px] text-ink-2 break-all">{user?.email ?? "—"}</span>
        </InfoRow>
        <InfoRow label="Pseudo">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] text-ink">@{profile?.username ?? "—"}</span>
            {profile?.role && <RoleBadge role={profile.role} showLabel />}
          </span>
        </InfoRow>
        <InfoRow label="Inscrit le">
          <span className="text-[12px] text-ink-2">{joined}</span>
        </InfoRow>
      </dl>
    </div>
  );
}

function PasswordCard() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password.length < 6) {
      setMessage({ kind: "err", text: "mot de passe trop court (6 caractères min)" });
      return;
    }
    if (password !== confirm) {
      setMessage({ kind: "err", text: "les deux mots de passe ne correspondent pas" });
      return;
    }
    setSubmitting(true);
    const err = await updatePassword(password);
    setSubmitting(false);
    if (err) {
      setMessage({ kind: "err", text: err });
      return;
    }
    setPassword("");
    setConfirm("");
    setMessage({ kind: "ok", text: "mot de passe mis à jour" });
  };

  return (
    <form onSubmit={handleSubmit} className="border border-line rounded-md p-5 flex flex-col gap-3">
      <div className="text-[14px] font-semibold uppercase tracking-[0.16em]">Mot de passe</div>
      <Feedback message={message} />
      <Field
        label="nouveau mot de passe"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        minLength={6}
        required
      />
      <Field
        label="confirme le mot de passe"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        minLength={6}
        required
      />
      <button
        type="submit"
        disabled={submitting}
        className="border border-ink bg-transparent text-ink text-[12px] font-semibold py-2.5 hover:border-red hover:text-red cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-default uppercase tracking-[0.12em]"
      >
        {submitting ? "…" : "Changer le mot de passe"}
      </button>
    </form>
  );
}

export default function ComptePage() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <Ticker />
      <Nav />

      <main className="flex-1 px-10 py-14 max-md:px-5 max-md:py-10 max-w-[640px] w-full mx-auto">
        <h1 className="font-bold tracking-[-0.02em] mb-8" style={{ fontSize: "clamp(32px, 5vw, 48px)" }}>
          Compte
        </h1>

        {loading ? (
          <p className="text-[13px] text-ink-3">Chargement…</p>
        ) : !user ? (
          <div className="border border-line rounded-md p-6 text-center flex flex-col items-center gap-4">
            <p className="text-[13px] text-ink-2 text-balance">
              Connecte-toi pour gérer ton email et ton mot de passe.
            </p>
            <Link
              href="/"
              className="border border-ink bg-transparent text-ink text-[12px] font-semibold py-2.5 px-5 hover:border-red hover:text-red transition-colors uppercase tracking-[0.12em]"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <IdentityCard />
            <PasswordCard />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
