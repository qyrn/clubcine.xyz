/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

describe("KeyboardShortcuts", () => {
  it("s'ouvre sur ? et se ferme sur Échap", () => {
    render(<KeyboardShortcuts />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: "?" });
    expect(screen.getByRole("dialog", { name: "Raccourcis clavier" })).toBeInTheDocument();
    expect(screen.getByText("Plein écran")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ignore ? quand le focus est dans un champ de saisie", () => {
    render(
      <>
        <input aria-label="msg" />
        <KeyboardShortcuts />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText("msg"), { key: "?" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("se ferme au clic sur le fond", () => {
    render(<KeyboardShortcuts />);
    fireEvent.keyDown(document.body, { key: "?" });
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
