import { ImageResponse } from "next/og";
import { OG_SEAL } from "../og-seal";
import { loadOgFonts } from "../og-fonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "club ciné · ouverture de la salle";

export default async function SoonOpengraphImage() {
  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#000000",
          fontFamily: "Inter",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={OG_SEAL} width={240} height={240} alt="" />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 30,
            fontFamily: "Permanent Marker",
            fontSize: 64,
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex" }}>club</div>
          <div
            style={{
              display: "flex",
              width: 16,
              height: 16,
              marginLeft: 10,
              marginRight: 10,
              borderRadius: 999,
              background: "#ff0033",
            }}
          />
          <div style={{ display: "flex" }}>ciné</div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 48,
            color: "#ff0033",
            fontSize: 27,
            fontWeight: 800,
            letterSpacing: 6,
          }}
        >
          OUVERTURE DE LA SALLE
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 22,
            color: "#aaaaaa",
            fontSize: 30,
            fontWeight: 400,
          }}
        >
          1ER SEPTEMBRE 2026 · 21H · PARIS
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
