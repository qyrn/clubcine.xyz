/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import AdminGuard from "@/components/AdminGuard";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children?: ReactNode; href?: unknown }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

describe("AdminGuard · allowed vrai", () => {
  it("rend le contenu enfant", () => {
    render(
      <AdminGuard authLoading={false} allowed={true}>
        <div>Contenu protégé</div>
      </AdminGuard>
    );
    expect(screen.getByText("Contenu protégé")).toBeInTheDocument();
    expect(screen.queryByText("★ Accès refusé")).not.toBeInTheDocument();
  });
});

describe("AdminGuard · allowed faux", () => {
  it("affiche l'écran d'accès refusé et masque le contenu enfant", () => {
    render(
      <AdminGuard authLoading={false} allowed={false}>
        <div>Contenu protégé</div>
      </AdminGuard>
    );
    expect(screen.getByText("★ Accès refusé")).toBeInTheDocument();
    expect(screen.getByText("Réservé aux admins")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /RETOUR/ })).toHaveAttribute("href", "/");
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("affiche un heading personnalisé quand il est fourni", () => {
    render(
      <AdminGuard authLoading={false} allowed={false} heading="Réservé à la modération">
        <div>Contenu protégé</div>
      </AdminGuard>
    );
    expect(screen.getByText("Réservé à la modération")).toBeInTheDocument();
  });
});

describe("AdminGuard · authLoading vrai", () => {
  it("affiche l'état de chargement avant tout autre écran, même si allowed est faux", () => {
    render(
      <AdminGuard authLoading={true} allowed={false}>
        <div>Contenu protégé</div>
      </AdminGuard>
    );
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
    expect(screen.queryByText("★ Accès refusé")).not.toBeInTheDocument();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("affiche l'état de chargement même si allowed est vrai", () => {
    render(
      <AdminGuard authLoading={true} allowed={true}>
        <div>Contenu protégé</div>
      </AdminGuard>
    );
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });
});
