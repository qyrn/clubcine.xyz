"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import Brand from "./Brand";
import ViewerCount from "./ViewerCount";
import AuthModal from "./AuthModal";

interface NavLink {
  href: string;
  label: string;
  key: string;
}

const LINKS: NavLink[] = [
  { href: "/movie", label: "Direct", key: "direct" },
  { href: "/programme", label: "Programme", key: "programme" },
  { href: "/soirees", label: "Soirées", key: "soirees" },
];

function getInitial(username: string | null): string {
  if (!username) return "?";
  const first = username.trim().charAt(0);
  return first ? first.toUpperCase() : "?";
}

function ProfileButton({
  username,
  avatarUrl,
}: {
  username: string | null;
  avatarUrl: string | null;
}) {
  const href = username ? `/u/${encodeURIComponent(username)}` : "/";
  return (
    <Link
      href={href}
      title={username ?? undefined}
      aria-label={username ? `Profil ${username}` : "Profil"}
      className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-line-2 bg-transparent text-ink text-[12px] font-semibold uppercase tracking-wide hover:border-ink transition-colors overflow-hidden shrink-0"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        getInitial(username)
      )}
    </Link>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function Nav({ active }: { active?: string }) {
  const { user, username, profile, signOut, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <nav className="grid grid-cols-[auto_1fr_auto] items-center gap-10 px-10 py-6 border-b border-line max-md:px-5 max-md:py-4 max-md:gap-4">
        <Brand />

        <div className="flex justify-center gap-8 max-md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              prefetch={false}
              className={`text-[13px] font-medium transition-colors ${
                active === l.key ? "text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4 text-[12px] text-ink-3 max-md:gap-3">
          <ViewerCount />
          {loading ? (
            <span
              aria-hidden
              className="w-8 h-8 rounded-full border border-line-2 bg-line/40 animate-pulse"
            />
          ) : user ? (
            <>
              <ProfileButton username={username} avatarUrl={profile?.avatarUrl ?? null} />
              <button
                onClick={() => signOut()}
                aria-label="Se déconnecter"
                title="Se déconnecter"
                className="text-ink-3 hover:text-red transition-colors cursor-pointer"
              >
                <LogoutIcon />
              </button>
            </>
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
