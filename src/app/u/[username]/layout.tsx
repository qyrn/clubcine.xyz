import type { Metadata } from "next";

interface Params {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  return {
    title: `@${decoded}`,
    description: `Profil de ${decoded} sur club ciné.`,
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
