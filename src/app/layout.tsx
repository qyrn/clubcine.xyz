import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: {
    default: "club ciné · 24/7",
    template: "%s · club ciné",
  },
  description: "Une chaîne de cinéma de contrebande. 100 films d'auteur en boucle, diffusés en synchrone, 24h/24.",
  manifest: "/favicon/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon/seal.png", type: "image/png" },
    ],
    apple: "/favicon/seal.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Permanent+Marker&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
