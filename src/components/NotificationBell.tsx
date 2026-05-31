"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useEscapeKey } from "@/lib/use-escape-key";
import { useNotifications, type AppNotification } from "@/lib/use-notifications";

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} j`;
}

function NotifIcon({ type }: { type: AppNotification["type"] }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  let glyph: React.ReactNode;
  let accent = false;
  switch (type) {
    case "follow":
      glyph = (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </>
      );
      break;
    case "guestbook":
      glyph = (
        <>
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-1.5" />
          <path d="M2 2l7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </>
      );
      break;
    case "mention":
      glyph = (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
        </>
      );
      break;
    case "role":
      glyph = (
        <>
          <path d="M12 2l3 6 6 .5-4.5 4 1.5 6L12 15l-6 3.5 1.5-6L3 8.5 9 8z" />
        </>
      );
      accent = true;
      break;
    case "suggestion_accepted":
      glyph = (
        <>
          <path d="M20 6L9 17l-5-5" />
        </>
      );
      accent = true;
      break;
    case "suggestion_rejected":
      glyph = (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      );
      break;
    case "badge":
      glyph = (
        <>
          <circle cx="12" cy="8" r="6" />
          <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
        </>
      );
      accent = true;
      break;
  }
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${
        accent ? "bg-red/15 text-red" : "bg-line-2/70 text-ink-2"
      }`}
    >
      <svg {...common}>{glyph}</svg>
    </span>
  );
}

const ROLE_LABELS: Record<string, string> = {
  spectateur: "spectateur",
  soutien: "soutien",
  moderateur: "modérateur",
  admin: "admin",
};

function NotifMessage({ n }: { n: AppNotification }) {
  const actor = <span className="font-semibold text-ink">{n.actorUsername}</span>;
  const detail = <span className="font-semibold text-ink">{n.detail}</span>;
  switch (n.type) {
    case "guestbook":
      return <>{actor} a signé ton livre d&apos;or</>;
    case "mention":
      return <>{actor} t&apos;a mentionné dans le chat</>;
    case "role":
      return (
        <>
          Tu es désormais{" "}
          <span className="font-semibold text-ink">
            {n.detail ? ROLE_LABELS[n.detail] ?? n.detail : "promu"}
          </span>
        </>
      );
    case "suggestion_accepted":
      return <>Ta suggestion {detail} a été acceptée</>;
    case "suggestion_rejected":
      return <>Ta suggestion {detail} n&apos;a pas été retenue</>;
    case "badge":
      return <>Nouveau badge débloqué : {detail}</>;
    default:
      return <>{actor} t&apos;a suivi</>;
  }
}

export default function NotificationBell() {
  const { user, username } = useAuth();
  const { notifications, unreadCount, loading, markRead, markAllRead } =
    useNotifications(user?.id ?? null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useEscapeKey(close, open);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) return null;

  const ownProfile = username ? `/u/${encodeURIComponent(username)}` : "/";

  const hrefFor = (n: AppNotification): string => {
    if (n.type === "guestbook" || n.type === "role" || n.type === "badge") {
      return ownProfile;
    }
    if (n.type === "suggestion_accepted" || n.type === "suggestion_rejected") {
      return "/programme";
    }
    if (n.type === "mention") return "/movie";
    return `/u/${encodeURIComponent(n.actorUsername)}`;
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
            : "Notifications"
        }
        aria-expanded={open}
        className="relative inline-flex items-center justify-center w-10 h-10 text-ink-3 hover:text-ink transition-colors cursor-pointer"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-1 flex items-center justify-center bg-red text-bg font-mono text-[9px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[320px] max-w-[calc(100vw-2.5rem)] border border-line bg-bg rounded-md overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-3 hover:text-red transition-colors cursor-pointer"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 font-mono text-[11px] tracking-[0.04em] uppercase text-ink-3 text-center">
                Chargement…
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 font-mono text-[11px] italic tracking-[0.04em] uppercase text-ink-3 text-center">
                Rien pour le moment…
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={hrefFor(n)}
                      prefetch={false}
                      onClick={() => {
                        if (!n.read) markRead(n.id);
                        setOpen(false);
                      }}
                      className={`flex items-center gap-3 pr-4 py-2.5 border-l-2 transition-colors ${
                        n.read
                          ? "border-transparent pl-4 hover:bg-line/30"
                          : "border-red pl-[14px] bg-red/[0.05] hover:bg-red/[0.09]"
                      }`}
                    >
                      <NotifIcon type={n.type} />
                      <span className="min-w-0 flex-1 flex items-baseline justify-between gap-2.5">
                        <span className="text-[12.5px] leading-[1.4] text-ink-2 break-words">
                          <NotifMessage n={n} />
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.04em] text-ink-3 shrink-0">
                          {timeAgo(n.createdAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
