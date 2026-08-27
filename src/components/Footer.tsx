import Link from "next/link";
import BugReportButton from "@/components/BugReportButton";

export default function Footer({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`px-10 py-6 flex justify-between items-center font-mono font-medium text-[11px] tracking-[0.04em] text-ink-3 max-md:px-5 max-md:py-4 max-md:flex-col max-md:gap-2${className ? ` ${className}` : ""}`}
    >
      <span>CLUBCINE.XYZ · CHANNEL 01 · 2026</span>
      <span className="flex flex-wrap gap-3 justify-end max-md:justify-center">
        <a
          href="https://ko-fi.com/clubcinefr"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink transition-colors"
        >
          KO-FI
        </a>
        <span>·</span>
        <Link href="/soutiens" className="hover:text-ink transition-colors">
          SOUTIENS
        </Link>
        <span>·</span>
        <Link href="/about" className="hover:text-ink transition-colors">
          À PROPOS
        </Link>
        <span>·</span>
        <BugReportButton inline />
      </span>
    </footer>
  );
}
