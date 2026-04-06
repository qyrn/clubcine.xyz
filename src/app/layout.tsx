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
      <body className="h-full">{children}</body>
    </html>
  );
}
