import { ImageResponse } from "next/og";
import { getCurrentSchedule } from "@/lib/schedule-engine";
import { OG_SEAL } from "./og-seal";
import { loadOgFonts } from "./og-fonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "À l'antenne sur club ciné";
export const revalidate = 60;

export default async function OpengraphImage() {
  const { currentFilm } = getCurrentSchedule();
  const title = currentFilm.title;
  const titleSize = title.length > 38 ? 56 : 82;
  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
          }}
        >
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
              width: "100%",
              justifyContent: "center",
              textAlign: "center",
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
            width: "100%",
            justifyContent: "space-between",
            color: "#8a8a8a",
            fontSize: 23,
            fontWeight: 400,
            letterSpacing: 4,
          }}
        >
          <div style={{ display: "flex" }}>CLUBCINE.XYZ</div>
          <div style={{ display: "flex" }}>CHANNEL 01 · 2026</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
