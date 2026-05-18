"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { normalizeLetterboxdFilm } from "@/lib/letterboxd";
import TMDBSearch, { TMDBPick } from "./TMDBSearch";

const LETTERBOXD_LIST = "https://letterboxd.com/clubcinefr/list/club-cine-juin-2026/";
const CURRENT_MONTH_LABEL = "Juin 2026";

export default function Suggestions() {
  const { user, username } = useAuth();
  const [letterboxd, setLetterboxd] = useState("");
  const [title, setTitle] = useState("");
  const [poster, setPoster] = useState("");
  const [posterChoices, setPosterChoices] = useState<string[]>([]);
  const [credit, setCredit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const t = setTimeout(() => setStatus("idle"), 5000);
    return () => clearTimeout(t);
  }, [status]);

  const onTMDBPick = (m: TMDBPick) => {
    setTitle(m.year ? `${m.title} (${m.year})` : m.title);
    if (m.posters.length > 0) {
      setPoster(m.posters[0]);
      setPosterChoices(m.posters);
    } else if (m.posterUrl) {
      setPoster(m.posterUrl);
      setPosterChoices([m.posterUrl]);
    }
    if (m.letterboxdSlug) {
      setLetterboxd(m.letterboxdSlug);
    } else if (m.imdbId) {
      setLetterboxd(`imdb/${m.imdbId}`);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterboxd.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("suggestions").insert({
        kind: "film",
        user_id: user?.id ?? null,
        username: username ?? null,
        payload: {
          letterboxd: normalizeLetterboxdFilm(letterboxd),
          title: title.trim() || null,
          poster: poster.trim() || null,
        },
        credit: credit && !!user,
      });
      if (error) {
        setStatus("error");
        return;
      }
      setLetterboxd("");
      setTitle("");
      setPoster("");
      setPosterChoices([]);
      setCredit(false);
      setStatus("sent");
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
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

      <p className="text-[14px] leading-[1.6] text-ink-2 text-balance">
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
            Lien Letterboxd obligatoire. Poster perso et signature optionnels.
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <TMDBSearch
            onPick={onTMDBPick}
            placeholder="Chercher un film (TMDB)…"
          />

          <div className="flex items-stretch border border-line-2 focus-within:border-ink rounded-md overflow-hidden">
            <span className="px-2.5 flex items-center font-mono text-[11px] text-ink-3 bg-line/40 select-none whitespace-nowrap">
              letterboxd.com/{letterboxd.startsWith("imdb/") ? "" : "film/"}
            </span>
            <input
              type="text"
              value={letterboxd}
              onChange={(e) => setLetterboxd(e.target.value)}
              placeholder={letterboxd.startsWith("imdb/") ? "imdb/tt0118749" : "boogie-nights"}
              className="flex-1 bg-transparent px-2 py-2.5 text-[13px] text-ink placeholder:text-ink-3 outline-none"
              required
            />
          </div>

          {(title || poster) && (
            <div className="flex items-center gap-2.5 border border-line-2 rounded-md p-2 bg-bg">
              {poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={poster}
                  alt=""
                  className="w-9 h-[54px] object-cover rounded shrink-0 border border-line"
                />
              )}
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                {title && (
                  <span className="text-[12px] text-ink truncate">{title}</span>
                )}
                <span className="font-mono text-[10px] text-ink-3 tracking-[0.04em]">
                  {posterChoices.length > 1 ? `${posterChoices.length} posters dispo` : "poster auto"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTitle("");
                  setPoster("");
                  setPosterChoices([]);
                  setLetterboxd("");
                }}
                className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-3 hover:text-red transition-colors cursor-pointer shrink-0"
              >
                Vider
              </button>
            </div>
          )}

          {posterChoices.length > 1 && (
            <div className="flex flex-col gap-1">
              <div className="font-mono text-[9px] tracking-[0.16em] uppercase text-ink-3">
                Choisir un poster
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {posterChoices.map((p, i) => (
                  <button
                    key={`${p}-${i}`}
                    type="button"
                    onClick={() => setPoster(p)}
                    className={`shrink-0 w-9 aspect-[2/3] rounded overflow-hidden border-2 transition-all cursor-pointer ${
                      poster === p ? "border-red" : "border-line-2 hover:border-ink-3 opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2.5 text-[12px] text-ink-2 cursor-pointer select-none mt-1">
            <input
              type="checkbox"
              checked={credit}
              onChange={(e) => setCredit(e.target.checked)}
              className="w-3.5 h-3.5 accent-red cursor-pointer"
              disabled={!username}
            />
            <span>
              Afficher{" "}
              <span className="font-mono text-[11px] tracking-[0.04em] text-ink-3">
                « Film choisi par {username ?? "anonyme"} »
              </span>{" "}
              dans la programmation
              {!username && (
                <span className="text-ink-3"> · connexion requise</span>
              )}
            </span>
          </label>

          <div className="flex items-center justify-between gap-3 mt-1">
            <div
              className="font-mono text-[11px] tracking-[0.04em] transition-opacity"
              style={{ opacity: status === "idle" ? 0 : 1 }}
              aria-live="polite"
            >
              {status === "sent" && (
                <span className="text-red">★ Suggestion notée, merci.</span>
              )}
              {status === "error" && (
                <span className="text-red">✕ Erreur, réessaie.</span>
              )}
            </div>
            <button
              type="submit"
              disabled={!letterboxd.trim() || submitting}
              className="px-4 py-2.5 border border-ink text-ink font-semibold text-[12px] bg-transparent hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default rounded-md"
            >
              {submitting ? "…" : "Proposer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
