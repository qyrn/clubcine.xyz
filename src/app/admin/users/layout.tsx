import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users admin",
  description: "Gestion des rôles et badges des utilisateurs.",
  robots: { index: false, follow: false },
};

export default function AdminUsersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
