"use client";

import Link from "next/link";
import Image from "next/image";

interface BrandProps {
  href?: string;
  sealSize?: number;
  fontSize?: number;
  className?: string;
}

export default function Brand({
  href = "/",
  sealSize = 32,
  fontSize = 22,
  className,
}: BrandProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-3 transition-opacity hover:opacity-80 select-none ${className ?? ""}`.trim()}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      draggable={false}
      style={{ WebkitUserDrag: "none" } as React.CSSProperties}
    >
      <span
        aria-hidden
        className="pointer-events-none select-none"
        style={{ WebkitUserDrag: "none" } as React.CSSProperties}
      >
        <Image
          src="/favicon/seal.png"
          alt=""
          width={sealSize}
          height={sealSize}
          unoptimized
          priority
          draggable={false}
        />
      </span>
      <span
        className="inline-flex items-baseline leading-none -translate-y-[2px] select-none"
        style={{ fontFamily: "var(--font-marker)", fontSize: `${fontSize}px` }}
      >
        club
        <span
          aria-hidden
          className="mx-[2px] pulse-dot"
          style={{ color: "var(--color-red)" }}
        >
          ·
        </span>
        ciné
      </span>
    </Link>
  );
}
