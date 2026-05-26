import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Modération chat",
  description: "Gel, slow mode et bans du chat live.",
  robots: { index: false, follow: false },
};

export default function AdminChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
