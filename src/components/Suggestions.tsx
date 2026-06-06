"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { normalizeLetterboxdFilm } from "@/lib/letterboxd";
import TMDBSearch, { TMDBPick } from "./TMDBSearch";

const LETTERBOXD_LIST = "https://letterboxd.com/clubcinefr/list/club-cine-juillet-2026/";
const CURRENT_MONTH_LABEL = "Juillet 2026";

const POSTER_MAX_BYTES = 2 * 1024 * 1024;
const POSTER_MIMES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type Mode = "film" | "soiree";

interface SoireeFilm {
  title: string;
  letterboxd: string;
  poster: string | null;
}

export default function Suggestions() {
  const { user, username } = useAuth();
  const [mode, setMode] = useState<Mode>("film");
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  const [letterboxd, setLetterboxd] = useState("");
  const [title, setTitle] = useState("");
  const [poster, setPoster] = useState("");
  const [posterChoices, setPosterChoices] = useState<string[]>([]);
  const [credit, setCredit] = useState(false);

  const [theme, setTheme] = useState("");
  const [soireeFilms, setSoireeFilms] = useState<SoireeFilm[]>([]);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "idle") return;
    const t = setTimeout(() => setStatus("idle"), 5000);
    return () => clearTimeout(t);
  }, [status]);

  const posterPreview = useMemo(
    () => (posterFile ? URL.createObjectURL(posterFile) : null),
    [posterFile]
  );
  useEffect(() => {
    if (!posterPreview) return;
    return () => URL.revokeObjectURL(posterPreview);
  }, [posterPreview]);

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

  const onSoireeTMDBPick = (m: TMDBPick) => {
    const label = m.year ? `${m.title} (${m.year})` : m.title;
    const raw = m.letterboxdSlug ?? (m.imdbId ? `imdb/${m.imdbId}` : "");
    const lb = raw ? normalizeLetterboxdFilm(raw) : "";
    setSoireeFilms((prev) => {
      if (prev.some((f) => f.title === label)) return prev;
      return [...prev, { title: label, letterboxd: lb, poster: m.posters[0] ?? m.posterUrl ?? null }];
    });
  };

  const removeSoireeFilm = (titleToRemove: string) => {
    setSoireeFilms((prev) => prev.filter((f) => f.title !== titleToRemove));
  };

  const onPickPoster = (f: File | null) => {
    if (!f) {
      setPosterFile(null);
      return;
    }
    if (!POSTER_MIMES[f.type]) {
      setErrorText("Poster : format non supporté (jpg, png, webp)");
      return;
    }
    if (f.size > POSTER_MAX_BYTES) {
      setErrorText("Poster : trop lourd (2 Mo max)");
      return;
    }
    setErrorText(null);
    setPosterFile(f);
  };

  const resetSoiree = () => {
    setTheme("");
    setSoireeFilms([]);
    setPosterFile(null);
    setCredit(false);
    if (posterInputRef.current) posterInputRef.current.value = "";
  };

  const submitFilm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterboxd.trim() || submitLockRef.current) return;
    submitLockRef.current = true;
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
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const submitSoiree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    if (!theme.trim()) {
      setErrorText("Donne un thème à la soirée");
      return;
    }
    if (soireeFilms.length < 2) {
      setErrorText("Choisis au moins 2 films");
      return;
    }
    submitLockRef.current = true;
    setSubmitting(true);
    setErrorText(null);
    try {
      let posterUrl: string | null = null;
      if (posterFile && user) {
        const ext = POSTER_MIMES[posterFile.type];
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("suggestion-posters")
          .upload(path, posterFile, { contentType: posterFile.type, upsert: false });
        if (upErr) {
          setErrorText(`Upload poster : ${upErr.message}`);
          return;
        }
        posterUrl = supabase.storage.from("suggestion-posters").getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase.from("suggestions").insert({
        kind: "soiree",
        user_id: user?.id ?? null,
        username: username ?? null,
        payload: {
          theme: theme.trim(),
          films: soireeFilms.map((f) => f.title).join("\n"),
          filmList: soireeFilms.map((f) => ({ title: f.title, letterboxd: f.letterboxd })),
          poster: posterUrl,
        },
        credit: credit && !!user,
      });
      if (error) {
        setStatus("error");
        return;
      }
      resetSoiree();
      setStatus("sent");
    } catch {
      setStatus("error");
    } finally {
      submitLockRef.current = false;
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
        <div className="flex items-center gap-2">
          {(["film", "soiree"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setStatus("idle");
                setErrorText(null);
              }}
              className={`px-3 py-1.5 text-[11px] font-mono tracking-[0.08em] uppercase border transition-colors cursor-pointer ${
                mode === m ? "border-ink text-ink" : "border-line-2 text-ink-3 hover:text-ink"
              }`}
            >
              {m === "film" ? "Un film" : "Une soirée"}
            </button>
          ))}
        </div>

        {mode === "film" ? (
          <>
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.16em] mb-1">
                Suggérer un film
              </div>
              <div className="text-[12px] text-ink-3 leading-[1.5]">
                Lien Letterboxd obligatoire. Poster perso et signature optionnels.
              </div>
            </div>

            <form onSubmit={submitFilm} className="flex flex-col gap-2.5">
              <TMDBSearch onPick={onTMDBPick} placeholder="Chercher un film (TMDB)…" />

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
                  {!username && <span className="text-ink-3"> · connexion requise</span>}
                </span>
              </label>

              <div className="flex items-center justify-between gap-3 mt-1">
                <div
                  className="font-mono text-[11px] tracking-[0.04em] transition-opacity"
                  style={{ opacity: status === "idle" ? 0 : 1 }}
                  aria-live="polite"
                >
                  {status === "sent" && <span className="text-red">★ Suggestion notée, merci.</span>}
                  {status === "error" && <span className="text-red">✕ Erreur, réessaie.</span>}
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
          </>
        ) : (
          <>
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.16em] mb-1">
                Suggérer une soirée
              </div>
              <div className="text-[12px] text-ink-3 leading-[1.5]">
                Un thème, deux films ou plus. Poster perso et signature optionnels.
              </div>
            </div>

            <form onSubmit={submitSoiree} className="flex flex-col gap-2.5">
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Thème de la soirée (ex : Mauvais plan)"
                maxLength={80}
                className="bg-transparent border border-line-2 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink transition-colors rounded-md"
                required
              />

              <TMDBSearch onPick={onSoireeTMDBPick} placeholder="Ajouter un film (TMDB)…" />

              {soireeFilms.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {soireeFilms.map((f) => (
                    <li
                      key={f.title}
                      className="flex items-center gap-2.5 border border-line-2 rounded-md p-2 bg-bg"
                    >
                      {f.poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={f.poster}
                          alt=""
                          className="w-8 h-[48px] object-cover rounded shrink-0 border border-line"
                        />
                      ) : (
                        <span className="w-8 h-[48px] rounded shrink-0 border border-line bg-line/40" />
                      )}
                      <span className="text-[12px] text-ink truncate flex-1">{f.title}</span>
                      <button
                        type="button"
                        onClick={() => removeSoireeFilm(f.title)}
                        className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-3 hover:text-red transition-colors cursor-pointer shrink-0"
                        aria-label={`Retirer ${f.title}`}
                      >
                        Retirer
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <label
                htmlFor="soiree-poster"
                className="flex items-center gap-2.5 border border-line-2 rounded-md p-2 bg-bg cursor-pointer hover:border-ink transition-colors"
                title={user ? "Ajouter un poster perso" : "Connexion requise pour un poster perso"}
              >
                {posterPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={posterPreview}
                    alt=""
                    className="w-9 h-[54px] object-cover rounded shrink-0 border border-line"
                  />
                ) : (
                  <span className="w-9 h-[54px] rounded shrink-0 border border-line-2 bg-line/40 flex items-center justify-center text-ink-3 text-[18px] leading-none">
                    +
                  </span>
                )}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-[12px] text-ink">
                    {posterFile ? posterFile.name : "Poster perso (optionnel)"}
                  </span>
                  <span className="font-mono text-[10px] text-ink-3 tracking-[0.04em]">
                    {user ? "jpg, png, webp · 2 Mo max" : "connexion requise"}
                  </span>
                </div>
                {posterFile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPosterFile(null);
                      if (posterInputRef.current) posterInputRef.current.value = "";
                    }}
                    className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-3 hover:text-red transition-colors cursor-pointer shrink-0"
                  >
                    Vider
                  </button>
                )}
                <input
                  id="soiree-poster"
                  ref={posterInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!user}
                  onChange={(e) => onPickPoster(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>

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
                    « Soirée proposée par {username ?? "anonyme"} »
                  </span>
                  {!username && <span className="text-ink-3"> · connexion requise</span>}
                </span>
              </label>

              <div className="flex items-center justify-between gap-3 mt-1">
                <div
                  className="font-mono text-[11px] tracking-[0.04em] transition-opacity"
                  aria-live="polite"
                >
                  {errorText ? (
                    <span className="text-red">✕ {errorText}</span>
                  ) : status === "sent" ? (
                    <span className="text-red">★ Soirée notée, merci.</span>
                  ) : status === "error" ? (
                    <span className="text-red">✕ Erreur, réessaie.</span>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={submitting || !theme.trim() || soireeFilms.length < 2}
                  className="px-4 py-2.5 border border-ink text-ink font-semibold text-[12px] bg-transparent hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default rounded-md"
                >
                  {submitting ? "…" : "Proposer"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
