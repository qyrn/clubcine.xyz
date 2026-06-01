"use client";

import Link from "next/link";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import Footer from "@/components/Footer";
import StaffApplyButton from "@/components/StaffApplyButton";

interface SocialLink {
  label: string;
  href: string;
  icon: "letterboxd" | "kofi";
}

interface Member {
  username: string;
  role: string;
  image: string | null;
  profileHref?: string;
  socials: SocialLink[];
}

const TEAM: Member[] = [
  {
    username: "club ciné",
    role: "Fondateur",
    image: null,
    socials: [
      { label: "Letterboxd", icon: "letterboxd", href: "https://letterboxd.com/clubcinefr/" },
      { label: "Ko-fi", icon: "kofi", href: "https://ko-fi.com/clubcinefr" },
    ],
  },
];

const QUICK_LINKS = [
  { label: "Soutenir sur Ko-fi", href: "https://ko-fi.com/clubcinefr", external: true },
  { label: "Suggérer un film", href: "/#suggestions", external: false },
  { label: "Proposer une soirée", href: "/soirees#suggest", external: false },
  { label: "Liste Letterboxd du mois", href: "https://letterboxd.com/clubcinefr/list/club-cine-juin-2026/", external: true },
];

function SocialIcon({ icon }: { icon: SocialLink["icon"] }) {
  if (icon === "letterboxd") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="6" cy="12" r="4" />
        <circle cx="12" cy="12" r="4" opacity="0.55" />
        <circle cx="18" cy="12" r="4" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8h1a3 3 0 0 1 0 6h-1" />
      <path d="M2 8h16v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8z" />
      <line x1="6" y1="2" x2="6" y2="5" />
      <line x1="10" y1="2" x2="10" y2="5" />
      <line x1="14" y1="2" x2="14" y2="5" />
    </svg>
  );
}

function MemberCardImage({ image, username }: { image: string | null; username: string }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={username}
        className="w-full aspect-[3/4] object-cover"
      />
    );
  }
  const letter = username.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="w-full aspect-[3/4] flex items-center justify-center bg-bg relative overflow-hidden"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,0.02) 2px 3px)",
      }}
    >
      <span
        className="text-ink leading-none select-none"
        style={{ fontFamily: "var(--font-seal)", fontSize: "clamp(120px, 18vw, 220px)" }}
      >
        {letter}
      </span>
      <div className="absolute bottom-3 left-3 right-3 flex justify-between font-mono text-[9px] tracking-[0.16em] uppercase text-ink-3">
        <span>★ Channel 01</span>
        <span>NO. 0001</span>
      </div>
    </div>
  );
}

function MemberCard({ member }: { member: Member }) {
  return (
    <article className="bg-surface border border-line rounded-md overflow-hidden flex flex-col">
      <MemberCardImage image={member.image} username={member.username} />
      <div className="px-5 py-5 flex flex-col items-center gap-3 text-center">
        <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-red font-bold">
          {member.role}
        </div>
        {member.profileHref ? (
          <Link
            href={member.profileHref}
            className="font-bold text-[20px] tracking-[-0.01em] uppercase text-ink hover:text-red transition-colors"
          >
            {member.username}
          </Link>
        ) : (
          <span className="font-bold text-[20px] tracking-[-0.01em] uppercase text-ink">
            {member.username}
          </span>
        )}
        {member.socials.length > 0 && (
          <div className="flex items-center gap-2 mt-1">
            {member.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                title={s.label}
                aria-label={s.label}
                className="w-8 h-8 rounded-full bg-line flex items-center justify-center text-ink-2 hover:text-red hover:bg-line-2 transition-colors"
              >
                <SocialIcon icon={s.icon} />
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function AboutContent() {
  return (
    <div className="flex flex-col min-h-screen">
      <Ticker />
      <Nav />

      <header className="px-10 py-24 border-b border-line flex flex-col items-center text-center gap-6 max-md:px-5 max-md:py-16">
        <div className="font-mono font-semibold text-[11px] leading-none tracking-[0.16em] uppercase text-ink-3">
          ★ <span className="text-red font-bold">Channel 01</span>
          {" · 100% indépendant"}
        </div>
        <h1
          className="font-bold leading-[0.95] tracking-[-0.04em] uppercase text-balance"
          style={{ fontSize: "clamp(48px, 7vw, 112px)" }}
        >
          L&apos;équipe <span className="text-red">club ciné</span>
        </h1>
        <p className="text-[15px] leading-[1.6] text-ink-2 max-w-[520px] text-balance">
          club ciné diffuse des films 24h/24, en tout genre. Parlez‑en à vos
          amis. Et surtout, suggérez les films que vous aimez.
        </p>
      </header>

      <section className="px-10 py-16 border-b border-line max-md:px-5 max-md:py-12">
        <div className="flex flex-wrap justify-center gap-6 max-w-[1100px] mx-auto">
          {TEAM.map((m) => (
            <div key={m.username} className="w-[260px] shrink-0">
              <MemberCard member={m} />
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {QUICK_LINKS.map((l) => {
            const Icon = l.external ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14 3h7v7" />
                <path d="M10 14L21 3" />
                <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            );
            const sharedClass = "inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase text-ink-3 hover:text-red transition-colors";
            return l.external ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className={sharedClass}
              >
                {l.label}
                {Icon}
              </a>
            ) : (
              <Link key={l.href} href={l.href} className={sharedClass}>
                {l.label}
                {Icon}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="px-10 py-20 border-b border-line flex flex-col items-center text-center gap-6 max-md:px-5 max-md:py-16">
        <div className="font-mono font-semibold text-[11px] leading-none tracking-[0.16em] uppercase text-ink-3">
          ★ <span className="text-red font-bold">Recrutement</span>
          {" · Channel 01"}
        </div>
        <h2
          className="font-bold leading-[1] tracking-[-0.03em] uppercase text-balance"
          style={{ fontSize: "clamp(32px, 4.5vw, 56px)" }}
        >
          On cherche des modérateurs
        </h2>
        <p className="text-[14px] leading-[1.6] text-ink-2 max-w-[620px] text-balance">
          Tu traînes sur le chat, tu connais le catalogue, tu veux aider à garder l&apos;ambiance saine ? Postule. On répond.
        </p>
        <StaffApplyButton />
      </section>

      <Footer />
    </div>
  );
}

export default function AboutPage() {
  return <AboutContent />;
}
