"use client";

import { useEscapeKey } from "@/lib/use-escape-key";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface Props {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  onConfirm,
  onClose,
}: Props) {
  useEscapeKey(onClose);
  useBodyScrollLock(true);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 px-4"
      onClick={onClose}
    >
      <div
        className="border border-line bg-bg max-w-sm w-full p-6 rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[14px] font-semibold uppercase tracking-[0.16em] mb-3">{title}</div>
        {message && (
          <p className="text-[13px] text-ink-2 leading-relaxed mb-5 text-balance">{message}</p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-line-2 text-ink-2 text-[11px] font-semibold uppercase tracking-[0.12em] hover:border-ink hover:text-ink transition-colors cursor-pointer rounded-md"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 border text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors cursor-pointer rounded-md ${
              destructive
                ? "border-red text-red hover:bg-red hover:text-bg"
                : "border-ink text-ink hover:border-red hover:text-red"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
