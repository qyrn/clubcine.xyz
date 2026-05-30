"use client";

import { useEffect, useRef, useState } from "react";

export interface TMDBMovie {
  id: number;
  title: string;
  originalTitle: string;
  year: string | null;
  posterUrl: string | null;
  overview: string;
}

export interface TMDBPick extends TMDBMovie {
  imdbId: string | null;
  posters: string[];
  letterboxdSlug: string | null;
}

interface Props {
  onPick: (movie: TMDBPick) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function TMDBSearch({ onPick, placeholder = "Chercher un film…", autoFocus }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      queueMicrotask(() => {
        setResults([]);
        setErr(null);
      });
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) {
          if (res.status === 503) {
            setErr("TMDB pas configuré côté serveur");
          } else {
            setErr(`Erreur TMDB ${res.status}`);
          }
          setResults([]);
        } else {
          const data = (await res.json()) as { results: TMDBMovie[] };
          setResults(data.results);
          setOpen(true);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setErr("Réseau indisponible");
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const [picking, setPicking] = useState<number | null>(null);

  const pick = async (m: TMDBMovie) => {
    setPicking(m.id);
    let imdbId: string | null = null;
    let posters: string[] = m.posterUrl ? [m.posterUrl] : [];
    let letterboxdSlug: string | null = null;
    try {
      const res = await fetch(`/api/tmdb/details?id=${m.id}`);
      if (res.ok) {
        const data = (await res.json()) as { imdbId: string | null; posters: string[] };
        imdbId = data.imdbId;
        if (data.posters.length > 0) posters = data.posters;
      }
      if (imdbId) {
        try {
          const r = await fetch(`/api/letterboxd/resolve?imdb=${imdbId}`);
          if (r.ok) {
            const d = (await r.json()) as { slug: string | null };
            letterboxdSlug = d.slug;
          }
        } catch {}
      }
    } catch {}
    setPicking(null);
    onPick({ ...m, imdbId, posters, letterboxdSlug });
    setQ("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full bg-transparent border border-line-2 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink rounded-md"
      />
      {(loading || err) && (
        <div className="mt-1 font-mono text-[10px] tracking-[0.04em] text-ink-3">
          {loading ? "★ recherche…" : <span className="text-red">{err}</span>}
        </div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1 max-h-[320px] overflow-y-auto bg-bg border border-line-2 rounded-md shadow-2xl">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => pick(r)}
                disabled={picking !== null}
                className="w-full flex items-center gap-3 p-2 hover:bg-line/40 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-default"
              >
                <div className="w-10 h-[60px] shrink-0 bg-line rounded overflow-hidden">
                  {r.posterUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.posterUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink truncate">{r.title}</div>
                  {r.year && (
                    <div className="font-mono text-[10px] tracking-[0.04em] text-ink-3">
                      {r.year}
                    </div>
                  )}
                </div>
                {picking === r.id && (
                  <span className="font-mono text-[10px] tracking-[0.04em] text-red shrink-0">…</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
