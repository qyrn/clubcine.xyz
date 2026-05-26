"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useEscapeKey } from "@/lib/use-escape-key";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface BanUserDialogProps {
  targetUserId: string;
  targetUsername: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type DurationKey = "1h" | "24h" | "7d" | "perma";

const DURATIONS: { key: DurationKey; label: string; ms: number }[] = [
  { key: "1h", label: "1 h", ms: 60 * 60 * 1000 },
  { key: "24h", label: "24 h", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7 j", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "perma", label: "perma", ms: 100 * 365 * 24 * 60 * 60 * 1000 },
];

export default function BanUserDialog({
  targetUserId,
  targetUsername,
  onClose,
  onSuccess,
}: BanUserDialogProps) {
  useEscapeKey(onClose);
  useBodyScrollLock(true);
  const [duration, setDuration] = useState<DurationKey>("24h");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleBan = async () => {
    const entry = DURATIONS.find((d) => d.key === duration);
    if (!entry) return;
    setError(null);
    setSubmitting(true);
    const until = new Date(Date.now() + entry.ms).toISOString();
    const { error: rpcError } = await supabase.rpc("chat_ban_user", {
      p_user_id: targetUserId,
      p_until: until,
      p_reason: reason.trim() || null,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onSuccess?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85"
      onClick={onClose}
    >
      <div
        className="border border-line bg-bg max-w-md w-full mx-4 p-6 rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="text-[14px] font-semibold uppercase tracking-[0.16em]">
            Ban du chat
          </span>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink transition-colors text-[18px] leading-none cursor-pointer"
            aria-label="fermer"
          >
            ×
          </button>
        </div>

        <p className="text-[13px] text-ink-2 mb-5 leading-[1.5]">
          Tu vas bannir{" "}
          <span className="text-ink font-semibold">@{targetUsername}</span> du
          chat. Il ne pourra plus envoyer de messages pendant la durée choisie.
        </p>

        <div className="mb-5">
          <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 mb-2">
            Durée
          </div>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDuration(d.key)}
                className={`border px-3 py-2 text-[12px] cursor-pointer transition-colors font-mono uppercase tracking-[0.08em] ${
                  duration === d.key
                    ? "border-red text-red"
                    : "border-line-2 text-ink-2 hover:border-ink hover:text-ink"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 mb-2 block">
            Raison (optionnelle)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            placeholder="spam, insultes, raid…"
            className="w-full bg-transparent border border-line-2 px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink transition-colors"
          />
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 border border-red bg-red/10 text-[12px] text-red font-mono leading-[1.4] break-words">
            ✕ {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-line-2 text-[12px] text-ink-2 hover:text-ink hover:border-ink cursor-pointer transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleBan}
            disabled={submitting}
            className="px-4 py-2 border border-red bg-red/10 text-[12px] text-red font-semibold cursor-pointer hover:bg-red hover:text-bg transition-colors disabled:opacity-50"
          >
            {submitting ? "ban…" : "Bannir"}
          </button>
        </div>
      </div>
    </div>
  );
}
