import { ImageResponse } from "next/og";
import { getCurrentSchedule } from "@/lib/schedule-engine";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "À l'antenne sur club ciné";
export const revalidate = 600;

export default function OpengraphImage() {
  const { currentFilm } = getCurrentSchedule();
  const title = currentFilm.title;
  const titleSize = title.length > 38 ? 58 : 84;

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
          padding: "78px 84px",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#ff0033",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 6,
          }}
        >
          {"À L'ANTENNE"}
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
            fontWeight: 500,
            letterSpacing: 4,
          }}
        >
          CLUBCINE.XYZ · CHAÎNE 01
        </div>
      </div>
    ),
    size,
  );
}
