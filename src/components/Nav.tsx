"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import Brand from "./Brand";
import ViewerCount from "./ViewerCount";
import AuthModal from "./AuthModal";

interface NavLink {
  href: string;
  label: string;
}

const LINKS: NavLink[] = [
  { href: "/movie", label: "Direct" },
  { href: "#programme", label: "Programme" },
  { href: "#soirees", label: "Soirées" },
  { href: "#liste", label: "Liste" },
];

export default function Nav({ active }: { active?: string }) {
  const { user, username, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <nav className="grid grid-cols-[auto_1fr_auto] items-center gap-10 px-10 py-6 border-b border-line max-md:px-5 max-md:py-4 max-md:gap-4">
        <Brand />

        <div className="flex justify-center gap-7 max-md:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-[13px] font-medium transition-colors ${
                active === l.label.toLowerCase() ? "text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-[18px] text-[12px] text-ink-3 max-md:gap-3">
          <span className="flex items-center gap-1.5 text-red font-semibold tracking-wider">
            <span className="inline-block w-2 h-2 rounded-full bg-red animate-[pulse-dot_1.5s_ease-in-out_infinite]" />
            <span className="max-md:hidden">EN DIRECT</span>
          </span>
          <ViewerCount />
          {user ? (
            <button
              onClick={() => signOut()}
              className="text-ink-3 hover:text-ink transition-colors cursor-pointer max-md:hidden"
              title={username ?? undefined}
            >
              déconnexion
            </button>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="text-ink-3 hover:text-ink transition-colors cursor-pointer"
            >
              connexion
            </button>
          )}
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
