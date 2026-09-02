"use client";

import { useAuth } from "@/lib/auth-context";
import { usePushReminder } from "@/lib/use-push-reminder";

export default function SoireeReminderToggle() {
  const { user } = useAuth();
  const { status, busy, subscribe, unsubscribe } = usePushReminder(user?.id ?? null);

  if (status === "unsupported") return null;

  const base =
    "inline-flex items-center gap-1.5 px-3 py-2 border font-mono text-[11px] uppercase tracking-[0.1em] rounded transition-colors disabled:opacity-40 disabled:cursor-default cursor-pointer";

  if (status === "subscribed") {
    return (
      <button
        type="button"
        onClick={unsubscribe}
        disabled={busy}
        className={`${base} border-red text-red hover:bg-red hover:text-bg`}
      >
        ★ Rappel activé
      </button>
    );
  }

  if (status === "denied") {
    return (
      <span
        className={`${base} border-line-2 text-ink-3`}
        title="Notifications bloquées pour ce site dans les réglages du navigateur"
      >
        Notifications bloquées
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={busy}
      className={`${base} border-line-2 text-ink-2 hover:border-ink hover:text-ink`}
    >
      M&apos;avertir avant chaque soirée
    </button>
  );
}
