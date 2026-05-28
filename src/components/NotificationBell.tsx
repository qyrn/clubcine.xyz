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

function actionLabel(type: AppNotification["type"]): string {
  if (type === "guestbook") return "a signé ton livre d'or";
  if (type === "mention") return "t'a mentionné dans le chat";
  return "t'a suivi";
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

  const hrefFor = (n: AppNotification): string => {
    if (n.type === "guestbook") {
      return username ? `/u/${encodeURIComponent(username)}` : "/";
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
                      className="flex items-start gap-3 px-4 py-3 hover:bg-line/40 transition-colors"
                    >
                      <span
                        className={`mt-[7px] w-1.5 h-1.5 rounded-full shrink-0 ${
                          n.read ? "bg-transparent" : "bg-red"
                        }`}
                        aria-hidden
                      />
                      <span className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[12px] leading-[1.5] text-ink-2 break-words">
                          <span className="font-semibold text-ink">
                            {n.actorUsername}
                          </span>{" "}
                          {actionLabel(n.type)}
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.04em] text-ink-3">
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
