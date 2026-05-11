import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos",
  description: "club ciné est une chaîne de cinéma de contrebande. 100 films d'auteur, diffusés en synchrone, 24h/24.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
