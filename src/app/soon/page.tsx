import type { Metadata } from "next";
import BrandSeal from "@/components/BrandSeal";
import Countdown from "@/components/Countdown";
import { LAUNCH_ISO } from "@/lib/launch";

export const metadata: Metadata = {
  title: "Ouverture imminente",
  robots: { index: false, follow: false },
};

export default function SoonPage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center gap-12 px-6 text-center overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 42%, rgba(255,255,255,0.05), transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-5 select-none">
        <BrandSeal size={92} />
        <span
          className="inline-flex items-baseline leading-none"
          style={{ fontFamily: "var(--font-marker)", fontSize: 32 }}
        >
          club
          <span
            aria-hidden
            className="mx-[3px] animate-[pulse-dot_2s_ease-in-out_infinite]"
            style={{ color: "var(--color-red)" }}
          >
            ·
          </span>
          ciné
        </span>
      </div>

      <p
        className="relative text-ink-3 text-[11px] tracking-[0.28em] uppercase text-balance"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        ★ Ouverture de la salle ★
      </p>

      <Countdown targetISO={LAUNCH_ISO} />

      <p
        className="relative text-ink-3 text-[12px] tracking-[0.18em] text-balance"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        1ER JUIN 2026 · MINUIT · PARIS
      </p>
    </main>
  );
}
