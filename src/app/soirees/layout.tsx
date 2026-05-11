import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soirées",
  description: "Nuits d'auteurs, marathons, cycles par pays ou par décennie. Les soirées thématiques de club ciné.",
};

export default function SoireesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
