"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

type Mode = "login" | "register";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (mode === "register") {
      if (username.trim().length < 3) {
        setError("pseudo trop court (3 caractères min)");
        setSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setError("mot de passe trop court (6 caractères min)");
        setSubmitting(false);
        return;
      }
      const err = await signUp(email, password, username.trim());
      if (err) {
        setError(err);
      } else {
        setSuccess(true);
      }
    } else {
      const err = await signIn(email, password);
      if (err) {
        setError(err);
      } else {
        onClose();
      }
    }

    setSubmitting(false);
  };

  if (success) {
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85">
      <div className="border border-border bg-surface max-w-xs w-full mx-4 p-5">
        <div className="flex items-center justify-between mb-5">
          <span className="font-[var(--font-title)] text-[20px] text-[#d4cfc7] italic">
            {mode === "login" ? "connexion" : "inscription"}
          </span>
          <button onClick={onClose} className="text-dim hover:text-warm text-[12px] cursor-pointer transition-colors">
            fermer
          </button>
        </div>

        {error && (
          <div className="text-[11px] text-red mb-3 border border-red/20 bg-red/5 px-2 py-1.5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <div>
              <label className="text-[11px] text-muted block mb-1">pseudo</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent border border-border px-2 py-1.5 text-[12px] text-[#d4cfc7] outline-none focus:border-raised"
                maxLength={20}
                required
              />
            </div>
          )}

          <div>
            <label className="text-[11px] text-muted block mb-1">email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full bg-transparent border border-border px-2 py-1.5 text-[12px] text-[#d4cfc7] outline-none focus:border-raised"
              required
            />
          </div>

          <div>
            <label className="text-[11px] text-muted block mb-1">mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full bg-transparent border border-border px-2 py-1.5 text-[12px] text-[#d4cfc7] outline-none focus:border-raised"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full border border-warm/30 text-warm text-[12px] py-2 hover:bg-warm/10 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-default"
          >
            {submitting ? "..." : mode === "login" ? "se connecter" : "créer un compte"}
          </button>
        </form>

        <div className="mt-4 text-center">
          {mode === "login" ? (
            <button
              onClick={() => { setMode("register"); setError(null); }}
              className="text-[11px] text-dim hover:text-warm/60 cursor-pointer transition-colors"
            >
              pas de compte ? inscris-toi
            </button>
          ) : (
            <button
              onClick={() => { setMode("login"); setError(null); }}
              className="text-[11px] text-dim hover:text-warm/60 cursor-pointer transition-colors"
            >
              déjà un compte ? connecte-toi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
