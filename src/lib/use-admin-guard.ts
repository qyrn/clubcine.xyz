import { useAuth } from "@/lib/auth-context";

export function useAdminGuard(allowedRoles: string[] = ["admin"]) {
  const { user, profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === "admin";
  const allowed = !!user && !!profile?.role && allowedRoles.includes(profile.role);
  return { user, profile, authLoading, isAdmin, allowed };
}
