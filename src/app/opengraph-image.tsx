import { ImageResponse } from "next/og";
import { getCurrentSchedule } from "@/lib/schedule-engine";
import { OG_SEAL } from "./og-seal-data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "À l'antenne sur club ciné";
export const revalidate = 600;

type LoadedFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 800;
  style: "normal";
};

const FONT_UA = "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)";

async function fetchFontFiles(query: string): Promise<ArrayBuffer[]> {
  const css = await fetch(`https://fonts.googleapis.com/css2?${query}`, {
    headers: { "User-Agent": FONT_UA },
  }).then((r) => r.text());
  const urls = [
    ...css.matchAll(/url\((https:\/\/[^)]+\.(?:ttf|otf|woff))\)/g),
  ].map((m) => m[1]);
  return Promise.all(urls.map((u) => fetch(u).then((r) => r.arrayBuffer())));
}

async function loadFonts(): Promise<LoadedFont[] | undefined> {
  try {
    const [inter, marker] = await Promise.all([
      fetchFontFiles("family=Inter:wght@400;800"),
      fetchFontFiles("family=Permanent+Marker"),
    ]);
    if (inter.length < 2 || marker.length < 1) return undefined;
    return [
      { name: "Inter", data: inter[0], weight: 400, style: "normal" },
      { name: "Inter", data: inter[1], weight: 800, style: "normal" },
      { name: "Permanent Marker", data: marker[0], weight: 400, style: "normal" },
    ];
  } catch {
    return undefined;
  }
}

export default async function OpengraphImage() {
  const { currentFilm } = getCurrentSchedule();
  const title = currentFilm.title;
  const titleSize = title.length > 38 ? 56 : 82;
  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          padding: "74px 84px",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={OG_SEAL} width={84} height={84} alt="" />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginLeft: 26,
              fontFamily: "Permanent Marker",
              fontSize: 54,
              color: "#ffffff",
            }}
          >
            <div style={{ display: "flex" }}>club</div>
            <div
              style={{
                display: "flex",
                width: 14,
                height: 14,
                marginLeft: 8,
                marginRight: 8,
                borderRadius: 999,
                background: "#ff0033",
              }}
            />
            <div style={{ display: "flex" }}>ciné</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              marginBottom: 22,
              color: "#ff0033",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 6,
            }}
          >
            {"À L'ANTENNE"}
          </div>
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: titleSize,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -1.5,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 26,
              color: "#aaaaaa",
              fontSize: 31,
              fontWeight: 400,
            }}
          >
            {`${currentFilm.director}, ${currentFilm.year}`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            color: "#8a8a8a",
            fontSize: 23,
            fontWeight: 400,
            letterSpacing: 4,
          }}
        >
          CLUBCINE.XYZ · CHANNEL 01 · 2026
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
