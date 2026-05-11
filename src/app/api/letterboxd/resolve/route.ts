import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resolve un IMDb id (ttXXXXXXX) en slug Letterboxd canonique en suivant
// la redirect 30x de letterboxd.com/imdb/<ttid>/ → /film/<slug>/.
// Cache 7 jours côté Next pour éviter de marteler letterboxd.com.

export async function GET(req: NextRequest) {
  const imdb = req.nextUrl.searchParams.get("imdb");
  if (!imdb || !/^tt\d+$/.test(imdb)) {
    return NextResponse.json({ error: "imdb id invalide" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://letterboxd.com/imdb/${imdb}/`, {
      redirect: "follow",
      headers: { "user-agent": "clubcine.xyz/1.0 (resolver)" },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    const finalUrl = new URL(res.url);
    const match = finalUrl.pathname.match(/^\/film\/([^/]+)\/?/);
    const slug = match?.[1] ?? null;

    return NextResponse.json({ slug, finalUrl: res.url });
  } catch {
    return NextResponse.json({ slug: null });
  }
}
