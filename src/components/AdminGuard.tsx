import Link from "next/link";

interface AdminGuardProps {
  authLoading: boolean;
  allowed: boolean;
  heading?: string;
  children: React.ReactNode;
}

export default function AdminGuard({ authLoading, allowed, heading = "Réservé aux admins", children }: AdminGuardProps) {
  if (authLoading) {
    return <div className="px-10 py-20 font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase">Chargement…</div>;
  }

  if (!allowed) {
    return (
      <div className="px-10 py-32 flex flex-col items-center gap-6 text-center">
        <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red">★ Accès refusé</div>
        <h1 className="font-bold leading-[0.95] tracking-[-0.04em] text-balance" style={{ fontSize: "clamp(40px, 6vw, 72px)" }}>{heading}</h1>
        <Link href="/" className="inline-flex items-center gap-3 px-5 py-3 border border-ink text-ink font-semibold text-[12px] tracking-wide hover:border-red hover:text-red transition-colors">RETOUR <span aria-hidden>→</span></Link>
      </div>
    );
  }

  return <>{children}</>;
}
