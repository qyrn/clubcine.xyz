"use client";

import Link from "next/link";
import BrandSeal from "./BrandSeal";

interface BrandProps {
  href?: string;
  sealSize?: number;
  fontSize?: number;
  sealColor?: string;
  className?: string;
}

export default function Brand({
  href = "/",
  sealSize = 32,
  fontSize = 22,
  sealColor = "#fff",
  className,
}: BrandProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-3 transition-opacity hover:opacity-80 ${className ?? ""}`.trim()}
      aria-label="club ciné, accueil"
    >
      <BrandSeal size={sealSize} color={sealColor} />
      <span
        className="inline-flex items-baseline leading-none -translate-y-[2px]"
        style={{ fontFamily: "var(--font-marker)", fontSize: `${fontSize}px` }}
      >
        club
        <span
          className="mx-[2px] animate-[pulse-dot_2s_ease-in-out_infinite]"
          style={{ color: "var(--color-red)" }}
        >
          ·
        </span>
        ciné
      </span>
    </Link>
  );
}
