import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suggestions admin",
  description: "Gestion des suggestions de films et soirées proposées par les visiteurs.",
  robots: { index: false, follow: false },
};

export default function AdminSuggestionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
