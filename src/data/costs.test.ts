import { describe, it, expect } from "vitest";
import {
  COSTS,
  knownMonthlyTotal,
  hasUnconfirmedCosts,
  type CostLine,
} from "@/data/costs";

describe("costs", () => {
  it("somme les coûts mensuels connus, ignore les null", () => {
    const lines: CostLine[] = [
      { label: "a", note: "", monthlyEur: 3 },
      { label: "b", note: "", monthlyEur: null },
      { label: "c", note: "", monthlyEur: 0 },
      { label: "d", note: "", monthlyEur: 1.5 },
    ];
    expect(knownMonthlyTotal(lines)).toBe(4.5);
  });

  it("détecte les coûts non confirmés", () => {
    expect(hasUnconfirmedCosts([{ label: "a", note: "", monthlyEur: null }])).toBe(true);
    expect(hasUnconfirmedCosts([{ label: "a", note: "", monthlyEur: 0 }])).toBe(false);
  });

  it("le catalogue réel a des libellés non vides", () => {
    expect(COSTS.length).toBeGreaterThan(0);
    for (const c of COSTS) expect(c.label.length).toBeGreaterThan(0);
  });
});
