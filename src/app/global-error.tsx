"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError({
      source: "next-global-error",
      message: error.message || "Unknown root error",
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          background: "#000",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ff0033" }}>
          ★ Antenne coupée
        </div>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", margin: 0, fontWeight: 700 }}>
          Erreur critique
        </h1>
        <p style={{ fontSize: 14, color: "#aaa", maxWidth: 420 }}>
          Le site a planté en racine. L&apos;incident a été noté.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "0.75rem 1.25rem",
            border: "1px solid #fff",
            background: "transparent",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.06em",
            cursor: "pointer",
            borderRadius: 6,
          }}
        >
          RÉESSAYER
        </button>
      </body>
    </html>
  );
}
