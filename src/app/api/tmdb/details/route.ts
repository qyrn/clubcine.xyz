import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

interface TmdbDetails {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  imdb_id: string | null;
  poster_path: string | null;
}

interface TmdbImage {
  file_path: string;
  iso_639_1: string | null;
  vote_average: number;
  width: number;
  height: number;
}

interface TmdbImages {
  posters: TmdbImage[];
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB_API_KEY missing" }, { status: 503 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const detailsUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=fr-FR`;
  const imagesUrl = `https://api.themoviedb.org/3/movie/${id}/images?api_key=${apiKey}`;

  try {
    const [detailsRes, imagesRes] = await Promise.all([
      fetch(detailsUrl, { next: { revalidate: 86400 } }),
      fetch(imagesUrl, { next: { revalidate: 86400 } }),
    ]);

    if (!detailsRes.ok) {
      return NextResponse.json({ error: `TMDB ${detailsRes.status}` }, { status: 502 });
    }

    const details = (await detailsRes.json()) as TmdbDetails;
    const images = imagesRes.ok ? ((await imagesRes.json()) as TmdbImages) : { posters: [] };

    const sortedPosters = [...images.posters].sort((a, b) => {
      const langScore = (img: TmdbImage) => (img.iso_639_1 === "fr" ? 2 : img.iso_639_1 === "en" || img.iso_639_1 === null ? 1 : 0);
      const ld = langScore(b) - langScore(a);
      if (ld !== 0) return ld;
      return b.vote_average - a.vote_average;
    });

    const posterUrls = sortedPosters.slice(0, 16).map((p) => `${POSTER_BASE}${p.file_path}`);
    if (details.poster_path) {
      const main = `${POSTER_BASE}${details.poster_path}`;
      if (!posterUrls.includes(main)) posterUrls.unshift(main);
    }

    return NextResponse.json({
      id: details.id,
      title: details.title || details.original_title,
      year: details.release_date ? details.release_date.slice(0, 4) : null,
      imdbId: details.imdb_id,
      posters: posterUrls,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 502 }
    );
  }
}
