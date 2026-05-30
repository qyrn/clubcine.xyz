"use client";

import { AuthProvider } from "@/lib/auth-context";
import BFCacheGuard from "@/components/BFCacheGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BFCacheGuard />
      {children}
    </AuthProvider>
  );
}
