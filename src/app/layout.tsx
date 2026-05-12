import type { Metadata } from "next";
import {
  Inter,
  Permanent_Marker,
  Bagel_Fat_One,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marker",
  display: "swap",
});

const bagelFatOne = Bagel_Fat_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-seal",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html
      lang="fr"
      className={`h-full ${inter.variable} ${permanentMarker.variable} ${bagelFatOne.variable} ${jetbrainsMono.variable}`}
    >
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
