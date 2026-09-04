/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleBadge, ROLE_ICONS } from "@/components/RoleBadge";

describe("RoleBadge · rôles connus", () => {
  for (const role of Object.keys(ROLE_ICONS)) {
    const conf = ROLE_ICONS[role];

    it(`affiche le label et l'icône pour le rôle ${role}`, () => {
      render(<RoleBadge role={role} showLabel />);
      expect(screen.getByText(conf.label)).toBeInTheDocument();
      const badge = screen.getByLabelText(conf.label);
      expect(badge.querySelector("svg")).toBeInTheDocument();
    });

    it(`n'affiche pas de texte de label pour le rôle ${role} sans showLabel, mais garde l'aria-label`, () => {
      render(<RoleBadge role={role} />);
      const badge = screen.getByLabelText(conf.label);
      expect(badge.querySelector("svg")).toBeInTheDocument();
      expect(screen.queryByText(conf.label)).not.toBeInTheDocument();
    });
  }
});

describe("RoleBadge · rôle inconnu ou absent", () => {
  it("ne rend rien pour un rôle absent du mapping", () => {
    const { container } = render(<RoleBadge role="spectateur" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ne rend rien pour une chaîne vide", () => {
    const { container } = render(<RoleBadge role="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
