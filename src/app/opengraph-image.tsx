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

async function loadInter(): Promise<LoadedFont[] | undefined> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;800",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
        },
      },
    ).then((r) => r.text());
    const urls = [
      ...css.matchAll(/url\((https:\/\/[^)]+\.(?:ttf|otf|woff))\)/g),
    ].map((m) => m[1]);
    if (urls.length < 2) return undefined;
    const [regular, bold] = await Promise.all(
      urls.slice(0, 2).map((u) => fetch(u).then((r) => r.arrayBuffer())),
    );
    return [
      { name: "Inter", data: regular, weight: 400, style: "normal" },
      { name: "Inter", data: bold, weight: 800, style: "normal" },
    ];
  } catch {
    return undefined;
  }
}

export default async function OpengraphImage() {
  const { currentFilm } = getCurrentSchedule();
  const title = currentFilm.title;
  const titleSize = title.length > 38 ? 58 : 84;
  const fonts = await loadInter();

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
          padding: "76px 84px",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#ff0033",
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: 6,
            }}
          >
            {"À L'ANTENNE"}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={OG_SEAL} width={120} height={120} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
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
              marginTop: 28,
              color: "#aaaaaa",
              fontSize: 32,
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
            fontSize: 24,
            fontWeight: 400,
            letterSpacing: 4,
          }}
        >
          CLUBCINE.XYZ · CHAÎNE 01
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
