"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportError } from "@/lib/report-error";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError({
      source: "next-error-boundary",
      message: error.message || "Unknown error",
      stack: error.stack,
    });
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-10 py-20 text-center">
      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-red">
        ★ Quelque chose a planté
      </div>
      <h1
        className="font-bold leading-[0.95] tracking-[-0.04em] text-balance"
        style={{ fontSize: "clamp(36px, 5vw, 64px)", fontFamily: "var(--font-marker)" }}
      >
        Mauvaise réception
      </h1>
      <p className="text-[14px] text-ink-2 max-w-[420px] text-balance">
        L&apos;antenne a hoqueté. On a noté l&apos;incident, tu peux retenter ou
        rentrer à la maison.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-3 px-5 py-3 border border-ink text-ink font-semibold text-[12px] tracking-wide hover:border-red hover:text-red transition-colors rounded-md cursor-pointer"
        >
          RÉESSAYER
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-3 px-5 py-3 border border-line-2 text-ink-2 font-semibold text-[12px] tracking-wide hover:border-ink hover:text-ink transition-colors rounded-md"
        >
          ← RETOUR
        </Link>
      </div>
    </main>
  );
}
