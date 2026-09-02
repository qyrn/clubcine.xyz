/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import FilmCurtain from "@/components/FilmCurtain";

describe("FilmCurtain", () => {
  it("ne rend rien tant qu'aucune transition n'a eu lieu", () => {
    const { container } = render(
      <FilmCurtain inIntermission={false} secondsLeft={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("déclenche un balayage à l'entrée en entracte", () => {
    const { container, rerender } = render(
      <FilmCurtain inIntermission={false} secondsLeft={null} />,
    );
    rerender(<FilmCurtain inIntermission={true} secondsLeft={120} />);
    expect(container.querySelector(".curtain-sweep-left")).toBeInTheDocument();
  });

  it("déclenche un balayage à la fin de l'entracte (<= 3s), une seule fois", () => {
    const { container, rerender } = render(
      <FilmCurtain inIntermission={true} secondsLeft={10} />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<FilmCurtain inIntermission={true} secondsLeft={3} />);
    const overlay = container.firstElementChild;
    expect(overlay).not.toBeNull();

    rerender(<FilmCurtain inIntermission={true} secondsLeft={2} />);
    expect(container.firstElementChild).toBe(overlay);
  });
});
