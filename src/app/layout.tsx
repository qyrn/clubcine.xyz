import type { Metadata, Viewport } from "next";
import {
  Inter,
  Permanent_Marker,
  Bagel_Fat_One,
  JetBrains_Mono,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Providers from "./providers";
import PWARegister from "@/components/PWARegister";
import MobileNotice from "@/components/MobileNotice";

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

const SITE_DESCRIPTION =
  "Une chaîne de cinéma de contrebande. 100 films d'auteur en boucle, diffusés en synchrone, 24h/24.";

export const metadata: Metadata = {
  metadataBase: new URL("https://clubcine.xyz"),
  title: {
    default: "club ciné · 24/7",
    template: "%s · club ciné",
  },
  description: SITE_DESCRIPTION,
  manifest: "/favicon/site.webmanifest",
  applicationName: "club ciné",
  appleWebApp: {
    capable: true,
    title: "club ciné",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    siteName: "club ciné",
    title: "club ciné · 24/7",
    description: SITE_DESCRIPTION,
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "club ciné · 24/7",
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: "/favicon/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/favicon/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
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
        <MobileNotice />
        <PWARegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
