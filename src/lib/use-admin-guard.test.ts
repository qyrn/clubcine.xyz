/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const authState = vi.hoisted(() => ({
  current: {
    user: null as { id: string } | null,
    profile: null as { role: string } | null,
    loading: false,
  },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState.current,
}));

import { useAdminGuard } from "@/lib/use-admin-guard";

describe("useAdminGuard · liste de rôles par défaut", () => {
  it("autorise un profil admin", () => {
    authState.current = { user: { id: "u1" }, profile: { role: "admin" }, loading: false };
    const { result } = renderHook(() => useAdminGuard());
    expect(result.current.allowed).toBe(true);
    expect(result.current.isAdmin).toBe(true);
  });

  it("refuse un profil modérateur", () => {
    authState.current = { user: { id: "u1" }, profile: { role: "moderateur" }, loading: false };
    const { result } = renderHook(() => useAdminGuard());
    expect(result.current.allowed).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it("refuse un visiteur anonyme sans utilisateur ni profil", () => {
    authState.current = { user: null, profile: null, loading: false };
    const { result } = renderHook(() => useAdminGuard());
    expect(result.current.allowed).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it("refuse un utilisateur connecté dont le profil n'est pas encore chargé", () => {
    authState.current = { user: { id: "u1" }, profile: null, loading: false };
    const { result } = renderHook(() => useAdminGuard());
    expect(result.current.allowed).toBe(false);
  });
});

describe("useAdminGuard · liste de rôles personnalisée", () => {
  it("autorise un rôle présent dans la liste passée en argument", () => {
    authState.current = { user: { id: "u1" }, profile: { role: "moderateur" }, loading: false };
    const { result } = renderHook(() => useAdminGuard(["admin", "moderateur"]));
    expect(result.current.allowed).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it("refuse un rôle absent de la liste passée en argument", () => {
    authState.current = { user: { id: "u1" }, profile: { role: "soutien" }, loading: false };
    const { result } = renderHook(() => useAdminGuard(["admin", "moderateur"]));
    expect(result.current.allowed).toBe(false);
  });
});

describe("useAdminGuard · authLoading", () => {
  it("expose authLoading tel que fourni par le contexte pendant le chargement initial", () => {
    authState.current = { user: null, profile: null, loading: true };
    const { result } = renderHook(() => useAdminGuard());
    expect(result.current.authLoading).toBe(true);
    expect(result.current.allowed).toBe(false);
  });

  it("ne fait pas dépendre allowed de authLoading : un profil déjà résolu reste autorisé pendant que loading vaut encore true", () => {
    authState.current = { user: { id: "u1" }, profile: { role: "admin" }, loading: true };
    const { result } = renderHook(() => useAdminGuard());
    expect(result.current.authLoading).toBe(true);
    expect(result.current.allowed).toBe(true);
  });
});
