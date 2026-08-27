import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soutiens",
  description:
    "Le générique de club ciné : les personnes dont les dons paient le serveur de la chaîne.",
};

export default function SoutiensLayout({ children }: { children: React.ReactNode }) {
  return children;
}
