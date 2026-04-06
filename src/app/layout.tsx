import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TV.QYRN",
  description: "cinema de contrebande",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
