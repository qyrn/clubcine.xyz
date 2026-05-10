"use client";

import { useEffect, useState } from "react";

const LETTERBOXD_LIST = "https://letterboxd.com/clubcinefr/list/club-cine-juin-2026/";
const CURRENT_MONTH_LABEL = "Juin 2026";

export default function Suggestions() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  useEffect(() => {
    if (status !== "sent") return;
    const t = setTimeout(() => setStatus("idle"), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setInput("");
    setStatus("sent");
  };

  return (
    <div className="p-10 max-md:p-6 flex flex-col h-full gap-6">
      <div>
        <div className="text-[13px] font-semibold uppercase tracking-[0.16em] mb-1">
          Programmation du mois
        </div>
        <div className="font-mono font-medium text-[11px] tracking-[0.04em] text-ink-3 uppercase">
          {CURRENT_MONTH_LABEL} · 100 films en rotation
        </div>
      </div>

      <p className="text-[14px] leading-[1.6] text-ink-2">
        La liste complète des films diffusés ce mois-ci est tenue à jour sur
        Letterboxd. Ordre, notes, réalisateurs, posters : tout y est.
      </p>

      <a
        href={LETTERBOXD_LIST}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-3 px-5 py-3.5 border border-ink bg-transparent text-ink font-semibold text-[12px] tracking-wide w-fit transition-colors hover:border-red hover:text-red rounded-md"
      >
        VOIR LA LISTE {CURRENT_MONTH_LABEL.toUpperCase()}
        <span aria-hidden>→</span>
      </a>

      <div className="mt-2 pt-6 border-t border-line flex flex-col gap-3">
        <div>
          <div className="text-[13px] font-semibold uppercase tracking-[0.16em] mb-1">
            Suggérer un film
          </div>
          <div className="text-[12px] text-ink-3 leading-[1.5]">
            Un film qui devrait passer ici ? Lien Letterboxd ou titre, on lit
            tout.
          </div>
        </div>

        <form onSubmit={submit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Titre, lien letterboxd…"
            className="flex-1 bg-transparent border border-line-2 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink transition-colors rounded-md"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2.5 border border-ink text-ink font-semibold text-[12px] bg-transparent hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default rounded-md"
          >
            Proposer
          </button>
        </form>

        <div
          className="font-mono text-[11px] tracking-[0.04em] text-red transition-opacity"
          style={{ opacity: status === "sent" ? 1 : 0 }}
          aria-live="polite"
        >
          ★ Suggestion notée, merci.
        </div>
      </div>
    </div>
  );
}
