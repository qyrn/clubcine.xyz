"use client";

import { useRef } from "react";
import { USERNAME_COLORS, findColor, isHexColor } from "@/lib/fonts";

interface ColorOption {
  slug: string;
  label: string;
  value: string;
}

interface Props {
  value: string | null;
  onChange: (slug: string) => void;
  label?: string;
  colors?: ColorOption[];
  resolve?: (slug?: string | null) => string;
  defaultSlug?: string;
}

export default function ColorPicker({
  value,
  onChange,
  label,
  colors = USERNAME_COLORS,
  resolve = findColor,
  defaultSlug = "default",
}: Props) {
  const current = value ?? defaultSlug;
  const customRef = useRef<HTMLInputElement>(null);
  const isCustom = isHexColor(value);
  const customValue = isCustom ? (value as string) : "#ff0033";

  return (
    <div>
      {label && (
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 mb-1.5">
          {label}
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        {colors.map((c) => {
          const active = !isCustom && c.slug === current;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => onChange(c.slug)}
              title={c.label}
              aria-label={c.label}
              className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                active
                  ? "border-ink scale-110"
                  : "border-line-2 hover:border-ink-3"
              }`}
              style={{ background: resolve(c.slug) }}
            />
          );
        })}

        <button
          type="button"
          onClick={() => customRef.current?.click()}
          title="Couleur personnalisée"
          aria-label="Couleur personnalisée"
          className={`relative w-7 h-7 rounded-full border-2 transition-all cursor-pointer overflow-hidden ${
            isCustom ? "border-ink scale-110" : "border-line-2 hover:border-ink-3"
          }`}
          style={{
            background: isCustom
              ? customValue
              : "conic-gradient(from 0deg, #ff0033, #fbbf24, #86efac, #a5b4fc, #fda4af, #ff0033)",
          }}
        >
          {!isCustom && (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-ink mix-blend-difference pointer-events-none">
              +
            </span>
          )}
        </button>

        <input
          ref={customRef}
          type="color"
          value={customValue}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          aria-hidden
        />

        {isCustom && (
          <span className="font-mono text-[10px] tracking-[0.04em] text-ink-3 uppercase">
            {customValue}
          </span>
        )}
      </div>
    </div>
  );
}
