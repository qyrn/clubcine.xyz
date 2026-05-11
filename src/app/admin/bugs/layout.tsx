import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bugs admin",
  description: "Gestion des rapports de bugs envoyés depuis le site.",
  robots: { index: false, follow: false },
};

export default function AdminBugsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
