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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="border border-border bg-black max-w-xs w-full mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] text-dim uppercase tracking-widest">
            {mode === "login" ? "Connexion" : "Inscription"}
          </div>
          <button onClick={onClose} className="text-dim hover:text-white text-[12px]">
            [x]
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <div>
              <label className="text-[10px] text-dim uppercase tracking-wider block mb-1">
                Pseudo
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent border border-border px-2 py-1.5 text-[12px] text-white outline-none focus:border-dim"
                maxLength={20}
              />
            </div>
          )}

          <div>
            <label className="text-[10px] text-dim uppercase tracking-wider block mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border border-border px-2 py-1.5 text-[12px] text-white outline-none focus:border-dim"
            />
          </div>

          <div>
            <label className="text-[10px] text-dim uppercase tracking-wider block mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border border-border px-2 py-1.5 text-[12px] text-white outline-none focus:border-dim"
            />
          </div>

          <button
            type="submit"
            className="w-full border border-border text-[11px] text-white uppercase tracking-wider py-2 hover:border-dim"
          >
            {mode === "login" ? "se connecter" : "creer un compte"}
          </button>
        </form>

        <div className="mt-4 text-center">
          {mode === "login" ? (
            <button
              onClick={() => setMode("register")}
              className="text-[10px] text-dim hover:text-white"
            >
              pas de compte ? inscris-toi
            </button>
          ) : (
            <button
              onClick={() => setMode("login")}
              className="text-[10px] text-dim hover:text-white"
            >
              deja un compte ? connecte-toi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
