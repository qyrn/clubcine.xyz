import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TmdbResult {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
}

interface TmdbResponse {
  results: TmdbResult[];
}

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

export async function GET(req: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB_API_KEY missing on server" },
      { status: 503 }
    );
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("query", q);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "fr-FR");
  url.searchParams.set("include_adult", "false");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: `TMDB ${res.status}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as TmdbResponse;
    const results = data.results.slice(0, 8).map((r) => ({
      id: r.id,
      title: r.title || r.original_title,
      year: r.release_date ? r.release_date.slice(0, 4) : null,
      posterUrl: r.poster_path ? `${POSTER_BASE}${r.poster_path}` : null,
      overview: r.overview ?? "",
    }));
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 502 }
    );
  }
}
