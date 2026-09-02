"use client";

import { useEffect, useState } from "react";
import { useEscapeKey } from "@/lib/use-escape-key";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface Shortcut {
  keys: string[];
  label: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["F"], label: "Plein écran" },
  { keys: ["M"], label: "Couper le son" },
  { keys: ["C"], label: "Sous-titres" },
  { keys: ["T"], label: "Afficher ou masquer le chat" },
  { keys: ["?"], label: "Cette aide" },
  { keys: ["Échap"], label: "Fermer" },
];

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      setOpen((v) => !v);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEscapeKey(() => setOpen(false), open);
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Raccourcis clavier"
        className="border border-line bg-bg max-w-sm w-full p-6 rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-[13px] font-semibold uppercase tracking-[0.16em]">Raccourcis</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            className="text-ink-3 hover:text-ink text-[16px] leading-none cursor-pointer"
          >
            ×
          </button>
        </div>
        <ul className="flex flex-col gap-2.5">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-4 text-[13px]"
            >
              <span className="text-ink-2">{s.label}</span>
              <span className="flex gap-1 shrink-0">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-[24px] px-1.5 py-0.5 border border-line-2 rounded text-center font-mono text-[11px] text-ink"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
