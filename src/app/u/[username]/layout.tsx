import type { Metadata } from "next";

interface Params {
  params: Promise<{ username: string }>;
}

function sanitizeUsername(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {}
  const cleaned = decoded.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  return cleaned || "anonyme";
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const safe = sanitizeUsername(username);
  return {
    title: `@${safe}`,
    description: `Profil de ${safe} sur club ciné.`,
    robots: { index: false, follow: true },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
