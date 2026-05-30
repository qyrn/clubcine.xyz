import Link from "next/link";
import Ticker from "@/components/Ticker";
import Nav from "@/components/Nav";
import AdminCrossNav from "@/components/AdminCrossNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Ticker />
      <Nav />
      <AdminCrossNav />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      <footer className="px-10 py-6 flex justify-between items-center font-mono font-medium text-[11px] tracking-[0.04em] text-ink-3 border-t border-line max-md:px-5 max-md:py-4 max-md:flex-col max-md:gap-2">
        <span>CLUBCINE.XYZ · ADMIN · 2026</span>
        <Link href="/" className="hover:text-ink transition-colors">
          ← RETOUR
        </Link>
      </footer>
    </div>
  );
}
