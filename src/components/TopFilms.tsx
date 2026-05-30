"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  normalizeLetterboxdFilm,
  letterboxdFilmSlug,
} from "@/lib/letterboxd";
import { fontStack } from "@/lib/fonts";
import TMDBSearch, { TMDBPick } from "./TMDBSearch";
import FontPicker from "./FontPicker";

export interface TopFilm {
  position: number;
  letterboxd: string;
  title: string;
  posterUrl: string | null;
  fontSlug: string | null;
}

interface TopFilmRow {
  user_id: string;
  position: number;
  letterboxd: string;
  title: string;
  poster_url: string | null;
  font_slug: string | null;
}

const POSITIONS = [1, 2, 3, 4] as const;

function rowToTopFilm(row: TopFilmRow): TopFilm {
  return {
    position: row.position,
    letterboxd: row.letterboxd,
    title: row.title,
    posterUrl: row.poster_url,
    fontSlug: row.font_slug,
  };
}

interface Props {
  userId: string;
  editable?: boolean;
}

export default function TopFilms({ userId, editable = false }: Props) {
  const [films, setFilms] = useState<Map<number, TopFilm>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profile_top_films")
        .select("user_id,position,letterboxd,title,poster_url,font_slug")
        .eq("user_id", userId)
        .order("position", { ascending: true });
      if (cancelled) return;
      const map = new Map<number, TopFilm>();
      for (const row of (data ?? []) as TopFilmRow[]) {
        map.set(row.position, rowToTopFilm(row));
      }
      setFilms(map);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase">
        Chargement…
      </div>
    );
  }

  if (!editable && films.size === 0) {
    return (
      <p className="text-[13px] text-ink-3 italic text-center text-balance">
        Top 4 vide.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2">
      {POSITIONS.map((pos) => (
        <TopFilmSlot
          key={pos}
          position={pos}
          film={films.get(pos) ?? null}
          editable={editable}
          userId={userId}
          onChange={(film) => {
            const next = new Map(films);
            if (film) next.set(pos, film);
            else next.delete(pos);
            setFilms(next);
          }}
        />
      ))}
    </div>
  );
}

interface SlotProps {
  position: number;
  film: TopFilm | null;
  editable: boolean;
  userId: string;
  onChange: (film: TopFilm | null) => void;
}

function TopFilmSlot({ position, film, editable, userId, onChange }: SlotProps) {
  const [editing, setEditing] = useState(false);
  const [letterboxd, setLetterboxd] = useState(letterboxdFilmSlug(film?.letterboxd ?? ""));
  const [title, setTitle] = useState(film?.title ?? "");
  const [poster, setPoster] = useState(film?.posterUrl ?? "");
  const [posterChoices, setPosterChoices] = useState<string[]>([]);
  const [fontSlug, setFontSlug] = useState<string>(film?.fontSlug ?? "default");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const open = () => {
    setLetterboxd(letterboxdFilmSlug(film?.letterboxd ?? ""));
    setTitle(film?.title ?? "");
    setPoster(film?.posterUrl ?? "");
    setPosterChoices([]);
    setFontSlug(film?.fontSlug ?? "default");
    setErr(null);
    setEditing(true);
  };

  const onTMDBPick = (m: TMDBPick) => {
    const vo = m.originalTitle || m.title;
    setTitle(m.year ? `${vo} (${m.year})` : vo);
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

  const save = async () => {
    if (saving) return;
    if (!letterboxd.trim() || !title.trim()) {
      setErr("Lien letterboxd et titre obligatoires");
      return;
    }
    setSaving(true);
    setErr(null);
    const normalized = normalizeLetterboxdFilm(letterboxd);
    try {
      const { error } = await supabase.from("profile_top_films").upsert(
        {
          user_id: userId,
          position,
          letterboxd: normalized,
          title: title.trim(),
          poster_url: poster.trim() || null,
          font_slug: fontSlug === "default" ? null : fontSlug,
        },
        { onConflict: "user_id,position" }
      );
      if (error) {
        setErr(error.message);
        return;
      }
      onChange({
        position,
        letterboxd: normalized,
        title: title.trim(),
        posterUrl: poster.trim() || null,
        fontSlug: fontSlug === "default" ? null : fontSlug,
      });
      setEditing(false);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profile_top_films")
        .delete()
        .eq("user_id", userId)
        .eq("position", position);
      if (error) {
        setErr(error.message);
        return;
      }
      onChange(null);
      setEditing(false);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    const showsImdb = letterboxd.startsWith("imdb/");
    return (
      <div className="flex flex-col gap-2 border border-line-2 rounded-md p-3 bg-bg">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-red">
          Slot {position}
        </div>

        <TMDBSearch
          onPick={onTMDBPick}
          placeholder="Chercher (TMDB)…"
          autoFocus
        />

        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="w-full aspect-[2/3] object-cover rounded border border-line-2"
          />
        )}

        {posterChoices.length > 1 && (
          <div className="flex flex-col gap-1">
            <div className="font-mono text-[9px] tracking-[0.16em] uppercase text-ink-3">
              Choisir un poster ({posterChoices.length})
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {posterChoices.map((p, i) => (
                <button
                  key={`${p}-${i}`}
                  type="button"
                  onClick={() => setPoster(p)}
                  className={`shrink-0 w-10 aspect-[2/3] rounded overflow-hidden border-2 transition-all cursor-pointer ${
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

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre"
          className="bg-transparent border border-line-2 px-2.5 py-1.5 text-[12px] text-ink placeholder:text-ink-3 outline-none focus:border-ink rounded-md"
        />

        <div className="flex items-stretch border border-line-2 focus-within:border-ink rounded-md overflow-hidden">
          <span className="px-2 flex items-center font-mono text-[10px] text-ink-3 bg-line/40 select-none whitespace-nowrap">
            lbxd/{showsImdb ? "" : "film/"}
          </span>
          <input
            type="text"
            value={letterboxd}
            onChange={(e) => setLetterboxd(e.target.value)}
            placeholder={showsImdb ? "imdb/tt0118749" : "boogie-nights"}
            className="flex-1 bg-transparent px-2 py-1.5 text-[12px] text-ink placeholder:text-ink-3 outline-none"
          />
        </div>
        {showsImdb && (
          <div className="font-mono text-[9px] tracking-[0.04em] text-ink-3">
            ★ Auto-rempli via IMDb. Letterboxd redirige vers la bonne fiche.
          </div>
        )}

        <FontPicker
          value={fontSlug}
          onChange={setFontSlug}
          preview={title.trim() || "Le titre"}
          label="Police du titre"
        />
        {err && (
          <div className="font-mono text-[10px] text-red tracking-[0.04em]">{err}</div>
        )}
        <div className="flex items-center justify-between gap-2 mt-1">
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            className="text-[10px] font-mono tracking-[0.08em] uppercase text-ink-3 hover:text-ink transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <div className="flex items-center gap-2">
            {film && (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="text-[10px] font-mono tracking-[0.08em] uppercase text-ink-3 hover:text-red transition-colors cursor-pointer"
              >
                Vider
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving || !letterboxd.trim() || !title.trim()}
              className="px-3 py-1.5 border border-ink text-ink font-semibold text-[10px] uppercase tracking-[0.08em] bg-transparent hover:border-red hover:text-red transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default rounded-md"
            >
              {saving ? "…" : "OK"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[2/3] border border-line rounded-md overflow-hidden bg-bg group">
        {film?.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={film.posterUrl}
            alt={film.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-mono text-[24px] font-bold text-ink-3">
            {position}
          </div>
        )}
        {editable && (
          <button
            type="button"
            onClick={open}
            className="absolute inset-0 bg-black/0 hover:bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-all cursor-pointer"
          >
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink border border-ink-2 px-2 py-1 rounded">
              {film ? "Modifier" : "Ajouter"}
            </span>
          </button>
        )}
      </div>
      {film ? (
        (() => {
          const yearMatch = film.title.match(/\((\d{4})\)\s*$/);
          const year = yearMatch?.[1] ?? null;
          const cleanTitle = year
            ? film.title.replace(/\s*\(\d{4}\)\s*$/, "")
            : film.title;
          const len = cleanTitle.length;
          const fontSize = len > 30 ? 12 : len > 22 ? 14 : len > 14 ? 16 : 18;
          return (
            <a
              href={film.letterboxd}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-0.5 text-center group/title w-full min-w-0 overflow-hidden"
              title={film.title}
            >
              <span
                className="block w-full max-w-full leading-[1.1] tracking-[-0.005em] text-ink group-hover/title:text-red transition-colors line-clamp-2 break-words [overflow-wrap:anywhere] hyphens-auto"
                style={{ fontFamily: fontStack(film.fontSlug ?? "marker"), fontSize: `${fontSize}px` }}
              >
                {cleanTitle}
              </span>
              {year && (
                <span className="font-mono text-[10px] tracking-[0.08em] text-ink-3 group-hover/title:text-red/70 transition-colors">
                  {year}
                </span>
              )}
            </a>
          );
        })()
      ) : (
        <span className="text-[11px] font-mono tracking-[0.04em] text-ink-3 uppercase text-center">
          {editable ? "Vide" : "–"}
        </span>
      )}
    </div>
  );
}
