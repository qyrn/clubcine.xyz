import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Programme",
  description: "Le programme des prochaines 24 heures sur club ciné. 100 films d'auteur en rotation, diffusés en synchrone.",
};

export default function ProgrammeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
