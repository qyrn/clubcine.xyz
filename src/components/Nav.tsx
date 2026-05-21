"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { safeImageUrl } from "@/lib/safe-url";
import { useEscapeKey } from "@/lib/use-escape-key";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import Brand from "./Brand";
import ViewerCount from "./ViewerCount";
import NotificationBell from "./NotificationBell";
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
  const safeAvatar = safeImageUrl(avatarUrl);
  return (
    <Link
      href={href}
      title={username ?? undefined}
      aria-label={username ? `Profil ${username}` : "Profil"}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-line-2 bg-transparent text-ink text-[12px] font-semibold uppercase tracking-wide hover:border-ink transition-colors overflow-hidden shrink-0"
    >
      {safeAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={safeAvatar} alt="" className="w-full h-full object-cover" />
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

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      {open ? (
        <>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </>
      ) : (
        <>
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </>
      )}
    </svg>
  );
}

function MobileMenu({
  active,
  onClose,
}: {
  active?: string;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  useBodyScrollLock(true);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-40 bg-bg/95 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      <div
        className="flex-1 flex flex-col items-center justify-center gap-8 px-10 pt-20 pb-12"
        onClick={(e) => e.stopPropagation()}
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            prefetch={false}
            onClick={onClose}
            className={`text-[24px] font-semibold tracking-[-0.01em] transition-colors ${
              active === l.key ? "text-red" : "text-ink hover:text-red"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="px-10 pb-10 font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 text-center">
        ★ Channel 01 · 24/7
      </div>
    </div>
  );
}

export default function Nav({ active }: { active?: string }) {
  const { user, username, profile, signOut, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [menuOpen]);

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
              className="w-10 h-10 rounded-full border border-line-2 bg-line/40 animate-pulse"
            />
          ) : user ? (
            <>
              <NotificationBell />
              <ProfileButton username={username} avatarUrl={profile?.avatarUrl ?? null} />
              <button
                onClick={() => signOut()}
                aria-label="Se déconnecter"
                title="Se déconnecter"
                className="text-ink-3 hover:text-red transition-colors cursor-pointer max-md:hidden"
              >
                <LogoutIcon />
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="text-ink-3 hover:text-ink transition-colors cursor-pointer max-md:hidden"
            >
              connexion
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            className="md:hidden text-ink hover:text-red transition-colors cursor-pointer p-1"
          >
            <BurgerIcon open={menuOpen} />
          </button>
        </div>
      </nav>

      {menuOpen && <MobileMenu active={active} onClose={() => setMenuOpen(false)} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
