"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";

interface SoireeIdea {
  title: string;
  films: string[];
  note: string;
}

const IDEAS: SoireeIdea[] = [
  {
    title: "Nuit Kubrick",
    films: ["Barry Lyndon", "2001", "Eyes Wide Shut"],
    note: "Trois passages, une seule nuit. Pause technique respectée.",
  },
  {
    title: "Polars japonais",
    films: ["Sonatine", "Hana-bi", "Branded to Kill"],
    note: "Kitano puis Suzuki. Soirée yakuza, sang sec.",
  },
  {
    title: "Comédie française",
    films: ["L'auberge espagnole", "Tanguy", "Le sens de la fête"],
    note: "Klapisch, Chatiliez, Toledano/Nakache. Soirée famille élargie.",
  },
  {
    title: "Marathon PTA",
    films: ["Magnolia", "Boogie Nights", "There Will Be Blood"],
    note: "Six heures, trois films, un seul cinéaste. Café fortement conseillé.",
  },
];

function SuggestForm() {
  const { user, username } = useAuth();
  const [theme, setTheme] = useState("");
  const [films, setFilms] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const t = setTimeout(() => setStatus("idle"), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim() || !films.trim() || submitting) return;
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

function SoireesContent() {
  return (
    <div className="flex flex-col min-h-screen">
      <Ticker />
      <Nav active="soirees" />

      <header className="px-10 py-24 border-b border-line flex flex-col items-center text-center gap-6 max-md:px-5 max-md:py-16">
        <div className="font-mono font-semibold text-[11px] leading-none tracking-[0.16em] uppercase text-ink-3">
          ★ <span className="text-red font-bold">Bientôt</span>
          {" · Programmation thématique"}
        </div>
        <h1
          className="font-bold leading-[0.95] tracking-[-0.04em]"
          style={{ fontSize: "clamp(56px, 8vw, 128px)" }}
        >
          Soirées
        </h1>
        <p className="text-[15px] leading-[1.6] text-ink-2 max-w-[520px]">
          Des nuits à thème : un cinéaste, un pays, une décennie, un genre. La
          programmation est en cours d&apos;écriture. Ces idées sont les premières
          pistes.
        </p>
      </header>

      <section className="px-10 py-12 border-b border-line max-md:px-5 max-md:py-10">
        <div className="flex justify-between items-baseline mb-8">
          <h2 className="text-[14px] font-semibold uppercase tracking-[0.16em]">
            Idées de soirées
          </h2>
          <span className="font-mono text-[11px] tracking-[0.04em] text-ink-3">
            En réflexion
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
          {IDEAS.map((idea, i) => (
            <article
              key={i}
              className="border border-line rounded-lg p-6 flex flex-col gap-3 transition-colors hover:border-line-2"
            >
              <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red">
                Idée {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="font-bold text-[24px] leading-[1.1] tracking-[-0.02em]">
                {idea.title}
              </h3>
              <ul className="font-mono text-[11px] tracking-[0.04em] text-ink-2 flex flex-wrap gap-x-3 gap-y-1">
                {idea.films.map((f) => (
                  <li key={f}>★ {f}</li>
                ))}
              </ul>
              <p className="text-[13px] leading-[1.6] text-ink-3 mt-1">{idea.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="suggest" className="scroll-mt-24 px-10 py-16 border-b border-line flex flex-col items-center text-center gap-6 max-md:px-5 max-md:py-12">
        <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red">
          ★ Une idée ?
        </div>
        <h2 className="font-bold text-[36px] leading-[1.05] tracking-[-0.02em] max-w-[560px] max-md:text-[28px]">
          Proposer une soirée thématique
        </h2>
        <p className="text-[14px] leading-[1.6] text-ink-2 max-w-[480px]">
          Trio de films, cinéaste, ambiance. Tout est pris en compte.
        </p>
        <SuggestForm />
      </section>

      <footer className="px-10 py-6 flex justify-between items-center font-mono font-medium text-[11px] tracking-[0.04em] text-ink-4 max-md:px-5 max-md:py-4 max-md:flex-col max-md:gap-2">
        <span>CLUBCINE.XYZ · CHANNEL 01 · 2026</span>
        <Link href="/" className="hover:text-ink transition-colors">
          ← RETOUR
        </Link>
      </footer>
    </div>
  );
}

export default function SoireesPage() {
  return <SoireesContent />;
}
