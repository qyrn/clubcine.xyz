"use client";

import { useEffect, useState } from "react";
import { generateSealCircles, SEAL_VIEW, type SealCircle } from "@/lib/seal";

interface BrandSealProps {
  size?: number;
  color?: string;
  seed?: number;
  className?: string;
  ariaLabel?: string;
}

const cache = new Map<number, SealCircle[]>();

export default function BrandSeal({
  size = 32,
  color = "#fff",
  seed = 42,
  className,
  ariaLabel = "club ciné · sceau",
}: BrandSealProps) {
  const [, setVersion] = useState(0);
  const circles = cache.get(seed) ?? null;

  useEffect(() => {
    if (cache.has(seed)) return;

    let cancelled = false;
    const build = () => {
      if (cancelled) return;
      const result = generateSealCircles(seed);
      cache.set(seed, result);
      setVersion((v) => v + 1);
    };

    if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(build);
    } else {
      build();
    }

    return () => {
      cancelled = true;
    };
  }, [seed]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${SEAL_VIEW} ${SEAL_VIEW}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
      xmlns="http://www.w3.org/2000/svg"
    >
      {circles && (
        <g fill={color}>
          {circles.map((c, i) => (
            <circle
              key={i}
              cx={c.cx.toFixed(1)}
              cy={c.cy.toFixed(1)}
              r={c.r.toFixed(2)}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
