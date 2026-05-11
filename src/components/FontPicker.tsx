"use client";

import { useEffect, useRef, useState } from "react";
import { FONTS, fontStack } from "@/lib/fonts";

interface Props {
  value: string | null;
  onChange: (slug: string) => void;
  preview: string;
  label?: string;
}

export default function FontPicker({ value, onChange, preview, label }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = FONTS.find((f) => f.slug === (value ?? "default")) ?? FONTS[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      {label && (
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 mb-1.5">
          {label}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 border border-line-2 hover:border-ink rounded-md transition-colors cursor-pointer"
      >
        <span
          className="text-[15px] truncate text-ink leading-tight"
          style={{ fontFamily: fontStack(current.slug) }}
        >
          {preview}
        </span>
        <span className="font-mono text-[10px] tracking-[0.04em] text-ink-3 shrink-0">
          {current.label} ▾
        </span>
      </button>
      {open && (
        <ul className="absolute z-30 left-0 right-0 mt-1 max-h-[280px] overflow-y-auto bg-bg border border-line-2 rounded-md shadow-2xl">
          {FONTS.map((f) => (
            <li key={f.slug}>
              <button
                type="button"
                onClick={() => {
                  onChange(f.slug);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-line/40 transition-colors cursor-pointer text-left ${
                  f.slug === current.slug ? "bg-line/60" : ""
                }`}
              >
                <span
                  className="text-[15px] truncate text-ink leading-tight"
                  style={{ fontFamily: fontStack(f.slug) }}
                >
                  {preview}
                </span>
                <span className="font-mono text-[10px] tracking-[0.04em] text-ink-3 shrink-0 max-w-[140px] truncate">
                  {f.label}
                  {f.note && <span className="text-ink-4"> · {f.note}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
