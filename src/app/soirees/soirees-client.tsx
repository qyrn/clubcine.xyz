"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import SoireeUpcomingCard from "@/components/SoireeUpcomingCard";

interface FilmView {
  id: string;
  title: string;
  poster?: string;
  director: string;
  year: number;
}

export interface SoireeView {
  id: string;
  title: string;
  subtitle?: string;
  films: FilmView[];
  startsAt: number;
  endsAt: number;
  posterFilmId?: string;
  posterCustomUrl?: string;
  creditedSuggestionId?: string;
  creditedUsername?: string;
}

export interface LiveSoireeView extends SoireeView {
  currentIndex: number;
}

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function formatPastDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function getPoster(soiree: SoireeView): string | undefined {
  if (soiree.posterCustomUrl) return soiree.posterCustomUrl;
  if (soiree.posterFilmId) {
    const f = soiree.films.find((f) => f.id === soiree.posterFilmId);
    if (f?.poster) return f.poster;
  }
  return soiree.films[0]?.poster;
}

function LiveHero({ soiree }: { soiree: LiveSoireeView }) {
  const poster = getPoster(soiree);
  const currentFilm = soiree.films[soiree.currentIndex];
  const [nowMs, setNowMs] = useState(soiree.endsAt);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    queueMicrotask(tick);
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const remainingSec = Math.max(0, Math.ceil((soiree.endsAt - nowMs) / 1000));
  const remainingH = Math.floor(remainingSec / 3600);
  const remainingM = Math.floor((remainingSec % 3600) / 60);

  return (
    <section className="px-10 py-16 border-b border-line max-md:px-5 max-md:py-12">
      <div className="grid grid-cols-[1fr_360px] gap-12 items-center max-[900px]:grid-cols-1 max-[900px]:gap-8">
        <div className="flex flex-col gap-5">
          <div className="font-mono font-semibold text-[11px] leading-none tracking-[0.16em] uppercase text-ink-3">
            ★ <strong className="text-red font-bold">Soirée en cours</strong>
            {" · "}
            {remainingH}h{remainingM.toString().padStart(2, "0")} restant
          </div>
          <h2
            className="font-bold leading-[0.95] tracking-[-0.03em] text-balance"
            style={{ fontSize: "clamp(40px, 5vw, 72px)" }}
          >
            {soiree.title}
          </h2>
          <ul className="font-mono font-medium text-[12px] leading-[1.6] tracking-[0.06em] uppercase text-ink-2 flex flex-wrap gap-x-3 gap-y-1">
            {soiree.films.map((film, i) => {
              const isCurrent = i === soiree.currentIndex;
              return (
                <li key={film.id} className={isCurrent ? "text-ink font-semibold" : ""}>
                  ★ {film.title}
                  {isCurrent && <span className="text-red"> · à l&apos;antenne</span>}
                </li>
              );
            })}
          </ul>
          <p className="text-[14px] leading-[1.6] text-ink-2 max-w-[480px] text-balance">
            Film en cours : <span className="text-ink font-semibold">{currentFilm.title}</span> ·{" "}
            {currentFilm.director}, {currentFilm.year}.
          </p>
          {soiree.creditedUsername && (
            <div className="font-mono text-[11px] tracking-[0.04em] text-ink-3">
              ★ Suggérée par{" "}
              <Link
                href={`/u/${encodeURIComponent(soiree.creditedUsername)}`}
                className="text-ink-2 hover:text-ink transition-colors"
              >
                @{soiree.creditedUsername}
              </Link>
            </div>
          )}
          <Link
            href="/movie"
            prefetch={false}
            className="inline-flex items-center gap-3 px-6 py-3.5 border border-ink bg-transparent text-ink font-semibold text-[13px] tracking-wide w-fit mt-1 transition-colors hover:border-red hover:text-red"
          >
            REJOINDRE LA SALLE
            <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="relative w-full max-w-[360px] mx-auto">
          {poster && (
            <div
              aria-hidden
              className="absolute inset-0 translate-y-3 -z-10 bg-cover bg-center blur-[40px] opacity-25 saturate-125"
              style={{ backgroundImage: `url(${poster})` }}
            />
          )}
          <div className="relative aspect-[2/3] border border-line bg-bg rounded-lg overflow-hidden">
            {poster && (
              <Image
                src={poster}
                alt=""
                fill
                priority
                sizes="(max-width: 900px) 280px, 360px"
                className="object-cover"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PastCard({ soiree }: { soiree: SoireeView }) {
  const poster = getPoster(soiree);
  return (
    <article className="flex gap-4 border border-line rounded-lg p-4 max-md:flex-col">
      <div className="relative w-[90px] aspect-[2/3] border border-line rounded-md overflow-hidden bg-bg shrink-0 max-md:w-full max-md:aspect-[16/9]">
        {poster && (
          <Image
            src={poster}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 90px"
            className="object-cover opacity-70"
          />
        )}
      </div>
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-ink-3">
          {formatPastDate(soiree.startsAt)}
        </div>
        <h3 className="font-bold text-[17px] leading-[1.15] tracking-[-0.01em] text-balance">{soiree.title}</h3>
        <div className="font-mono text-[11px] tracking-[0.04em] text-ink-3">
          {soiree.films.map((f) => f.title).join(" · ")}
        </div>
        {soiree.creditedUsername && (
          <div className="font-mono text-[10px] tracking-[0.04em] text-ink-3">
            Suggérée par{" "}
            <Link
              href={`/u/${encodeURIComponent(soiree.creditedUsername)}`}
              className="text-ink-2 hover:text-ink transition-colors"
            >
              @{soiree.creditedUsername}
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

function SuggestForm() {
  const { user, username } = useAuth();
  const [theme, setTheme] = useState("");
  const [films, setFilms] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const t = setTimeout(() => setStatus("idle"), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim() || !films.trim() || submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("suggestions").insert({
        kind: "soiree",
        user_id: user?.id ?? null,
        username: username ?? null,
        payload: { theme: theme.trim(), films: films.trim() },
        credit: false,
      });
      if (error) {
        setStatus("error");
        return;
      }
      setTheme("");
      setFilms("");
      setStatus("sent");
    } catch {
      setStatus("error");
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 w-full max-w-[520px]">
      <input
        type="text"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        placeholder="Thème (ex: Nuit Lynch, Cinéma coréen…)"
        className="bg-transparent border border-line-2 px-3.5 py-3 text-[14px] text-ink placeholder:text-ink-3 outline-none focus:border-ink transition-colors rounded-md"
        maxLength={80}
      />
      <textarea
        value={films}
        onChange={(e) => setFilms(e.target.value)}
        placeholder="Films pressentis, ambiance, ce que tu veux"
        rows={3}
        className="bg-transparent border border-line-2 px-3.5 py-3 text-[14px] text-ink placeholder:text-ink-3 outline-none focus:border-ink transition-colors rounded-md resize-none"
        maxLength={400}
      />
      <div className="flex items-center justify-between gap-4">
        <div
          className="font-mono text-[11px] tracking-[0.04em] transition-opacity"
          style={{ opacity: status === "idle" ? 0 : 1 }}
          aria-live="polite"
        >
          {status === "sent" && <span className="text-red">★ Soirée notée, merci.</span>}
          {status === "error" && <span className="text-red">✕ Erreur, réessaie.</span>}
        </div>
        <button
          type="submit"
          disabled={!theme.trim() || !films.trim() || submitting}
          className="px-5 py-2.5 border border-ink text-ink font-semibold text-[12px] bg-transparent hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default rounded-md"
        >
          {submitting ? "…" : "ENVOYER"}
        </button>
      </div>
    </form>
  );
}

interface Props {
  live: LiveSoireeView | null;
  upcoming: SoireeView[];
  past: SoireeView[];
}

export default function SoireesClient({ live, upcoming, past }: Props) {
  return (
    <div className="flex flex-col min-h-screen">
      <Ticker />
      <Nav active="soirees" />

      <header className="px-10 py-20 border-b border-line flex flex-col items-center text-center gap-6 max-md:px-5 max-md:py-14">
        <div className="font-mono font-semibold text-[11px] leading-none tracking-[0.16em] uppercase text-ink-3">
          ★ <span className="text-red font-bold">Tous les samedis</span>
          {" · 21h"}
        </div>
        <h1
          className="font-bold leading-[0.95] tracking-[-0.04em] text-balance"
          style={{ fontSize: "clamp(56px, 8vw, 128px)" }}
        >
          Soirées
        </h1>
        <p className="text-[15px] leading-[1.6] text-ink-2 max-w-[520px] text-balance">
          Une nuit à thème par semaine. Un trio de films liés par une idée, un cinéaste, une époque
          ou une obsession.
        </p>
      </header>

      {live && <LiveHero soiree={live} />}

      {upcoming.length > 0 && (
        <section className="px-10 py-14 border-b border-line max-md:px-5 max-md:py-10">
          <div className="flex justify-between items-baseline mb-8">
            <h2 className="text-[14px] font-semibold uppercase tracking-[0.16em] text-balance">
              {live ? "Soirées · ensuite" : "Soirées · à venir"}
            </h2>
            <span className="font-mono text-[11px] tracking-[0.04em] text-ink-3">
              {upcoming.length} programmée{upcoming.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-5 max-[1100px]:grid-cols-2 max-[600px]:grid-cols-1">
            {upcoming.map((s) => (
              <SoireeUpcomingCard
                key={s.id}
                poster={getPoster(s)}
                startsAt={s.startsAt}
                title={s.title}
                films={s.films}
                custom={!!s.posterCustomUrl}
                creditedUsername={s.creditedUsername}
              />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="px-10 py-14 border-b border-line max-md:px-5 max-md:py-10">
          <div className="flex justify-between items-baseline mb-8">
            <h2 className="text-[14px] font-semibold uppercase tracking-[0.16em] text-balance">
              Soirées · passées
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 max-[800px]:grid-cols-1">
            {past.slice(0, 10).map((s) => (
              <PastCard key={s.id} soiree={s} />
            ))}
          </div>
        </section>
      )}

      <section
        id="suggest"
        className="scroll-mt-24 px-10 py-16 border-b border-line flex flex-col items-center text-center gap-6 max-md:px-5 max-md:py-12"
      >
        <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red">
          ★ Une idée ?
        </div>
        <h2 className="font-bold text-[36px] leading-[1.05] tracking-[-0.02em] max-w-[560px] max-md:text-[28px] text-balance">
          Proposer une soirée thématique
        </h2>
        <p className="text-[14px] leading-[1.6] text-ink-2 max-w-[480px] text-balance">
          Trio de films, cinéaste, ambiance. Si elle passe à l&apos;antenne, ton nom est crédité.
        </p>
        <SuggestForm />
      </section>

      <footer className="px-10 py-6 flex justify-between items-center font-mono font-medium text-[11px] tracking-[0.04em] text-ink-3 max-md:px-5 max-md:py-4 max-md:flex-col max-md:gap-2">
        <span>CLUBCINE.XYZ · CHANNEL 01 · 2026</span>
        <Link href="/" className="hover:text-ink transition-colors">
          ← RETOUR
        </Link>
      </footer>
    </div>
  );
}
