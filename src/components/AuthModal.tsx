"use client";

import { useState } from "react";

type Mode = "login" | "register";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85">
      <div className="border border-border bg-black max-w-xs w-full mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-muted font-[var(--font-ui)]">
            {mode === "login" ? "connexion" : "inscription"}
          </span>
          <button onClick={onClose} className="text-muted hover:text-warm text-[11px] font-[var(--font-ui)] cursor-pointer">
            fermer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <div>
              <label className="text-[10px] text-muted font-[var(--font-ui)] block mb-1">
                pseudo
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent border border-border px-2 py-1.5 text-[12px] text-white/80 outline-none focus:border-[#333]"
                maxLength={20}
              />
            </div>
          )}

          <div>
            <label className="text-[10px] text-muted font-[var(--font-ui)] block mb-1">
              email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border border-border px-2 py-1.5 text-[12px] text-white/80 outline-none focus:border-[#333]"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted font-[var(--font-ui)] block mb-1">
              mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border border-border px-2 py-1.5 text-[12px] text-white/80 outline-none focus:border-[#333]"
            />
          </div>

          <button
            type="submit"
            className="w-full border border-border text-[11px] text-warm/70 font-[var(--font-ui)] py-2 hover:border-[#333] hover:text-warm cursor-pointer"
          >
            {mode === "login" ? "se connecter" : "creer un compte"}
          </button>
        </form>

        <div className="mt-4 text-center">
          {mode === "login" ? (
            <button
              onClick={() => setMode("register")}
              className="text-[10px] text-muted hover:text-warm/60 cursor-pointer"
            >
              pas de compte ? inscris-toi
            </button>
          ) : (
            <button
              onClick={() => setMode("login")}
              className="text-[10px] text-muted hover:text-warm/60 cursor-pointer"
            >
              deja un compte ? connecte-toi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
