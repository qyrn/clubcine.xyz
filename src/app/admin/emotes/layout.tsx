import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Emotes admin",
  description: "Gestion du catalogue d'emotes affichées dans le chat.",
  robots: { index: false, follow: false },
};

export default function AdminEmotesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
