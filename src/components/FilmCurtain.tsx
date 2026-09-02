"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const EXIT_THRESHOLD_SECONDS = 3;

export default function FilmCurtain({
  inIntermission,
  secondsLeft,
}: {
  inIntermission: boolean;
  secondsLeft: number | null;
}) {
  const reduced = usePrefersReducedMotion();
  const [sweep, setSweep] = useState(0);
  const wasInRef = useRef(inIntermission);
  const exitFiredRef = useRef(false);

  useEffect(() => {
    if (inIntermission && !wasInRef.current) setSweep((s) => s + 1);
    if (!inIntermission) exitFiredRef.current = false;
    wasInRef.current = inIntermission;
  }, [inIntermission]);

  useEffect(() => {
    if (
      inIntermission &&
      secondsLeft !== null &&
      secondsLeft <= EXIT_THRESHOLD_SECONDS &&
      !exitFiredRef.current
    ) {
      exitFiredRef.current = true;
      setSweep((s) => s + 1);
    }
  }, [inIntermission, secondsLeft]);

  if (sweep === 0) return null;

  return (
    <div
      key={sweep}
      aria-hidden
      className="absolute inset-0 z-[25] pointer-events-none overflow-hidden"
    >
      {reduced ? (
        <div className="curtain-fade absolute inset-0 bg-black" />
      ) : (
        <>
          <div className="projector-dim absolute inset-0 bg-black" />
          <div className="curtain-panel curtain-sweep-left absolute inset-y-0 left-0 w-[54%]" />
          <div className="curtain-panel curtain-panel-right curtain-sweep-right absolute inset-y-0 right-0 w-[54%]" />
          <div className="curtain-seam absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
        </>
      )}
    </div>
  );
}
