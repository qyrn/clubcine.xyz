import { NextResponse } from "next/server";
import { FILMS } from "@/data/schedule";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filmId = searchParams.get("film");
  const lang = searchParams.get("lang");

  if (!filmId || !lang) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const film = FILMS.find((f) => f.id === filmId);
  const sub = film?.subtitles?.find((s) => s.lang === lang);

  if (!sub) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const upstream = await fetch(sub.url);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "upstream failed" }, { status: 502 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt;charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch error" }, { status: 502 });
  }
}
