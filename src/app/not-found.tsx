import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Séance introuvable",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-10 py-20 text-center">
      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-red">
        ★ 404 · Hors grille
      </div>
      <h1
        className="font-bold leading-[0.95] tracking-[-0.04em] text-balance"
        style={{ fontSize: "clamp(36px, 5vw, 64px)", fontFamily: "var(--font-marker)" }}
      >
        Séance introuvable
      </h1>
      <p className="text-[14px] text-ink-2 max-w-[420px] text-balance">
        Cette page ne fait pas partie de la programmation. La chaîne, elle,
        continue de tourner.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-3 px-5 py-3 border border-ink text-ink font-semibold text-[12px] tracking-wide hover:border-red hover:text-red transition-colors rounded-md"
      >
        ← RETOUR À L&apos;ANTENNE
      </Link>
    </main>
  );
}
