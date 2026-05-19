import { describe, expect, it } from "vitest";
import {
  viewerTier,
  viewerTierLabel,
  chatterTier,
  chatterTierLabel,
} from "./tiers";

describe("viewerTier thresholds", () => {
  it("returns null below 1h", () => {
    expect(viewerTier(0)).toBeNull();
    expect(viewerTier(3599)).toBeNull();
  });

  it("returns habitue at >=1h, <10h", () => {
    expect(viewerTier(3600)).toBe("habitue");
    expect(viewerTier(10 * 3600 - 1)).toBe("habitue");
  });

  it("returns cinephile at >=10h, <50h", () => {
    expect(viewerTier(10 * 3600)).toBe("cinephile");
    expect(viewerTier(50 * 3600 - 1)).toBe("cinephile");
  });

  it("returns connaisseur at >=50h, <200h", () => {
    expect(viewerTier(50 * 3600)).toBe("connaisseur");
    expect(viewerTier(200 * 3600 - 1)).toBe("connaisseur");
  });

  it("returns cingle at >=200h, <500h", () => {
    expect(viewerTier(200 * 3600)).toBe("cingle");
    expect(viewerTier(500 * 3600 - 1)).toBe("cingle");
  });

  it("returns legende at >=500h", () => {
    expect(viewerTier(500 * 3600)).toBe("legende");
    expect(viewerTier(10000 * 3600)).toBe("legende");
  });
});

describe("chatterTier thresholds", () => {
  it("returns null below 10 messages", () => {
    expect(chatterTier(0)).toBeNull();
    expect(chatterTier(9)).toBeNull();
  });

  it("returns bavard at >=10, <50", () => {
    expect(chatterTier(10)).toBe("bavard");
    expect(chatterTier(49)).toBe("bavard");
  });

  it("returns animateur at >=50, <200", () => {
    expect(chatterTier(50)).toBe("animateur");
    expect(chatterTier(199)).toBe("animateur");
  });

  it("returns voix at >=200", () => {
    expect(chatterTier(200)).toBe("voix");
    expect(chatterTier(99999)).toBe("voix");
  });
});

describe("tier labels", () => {
  it("returns null for null tier", () => {
    expect(viewerTierLabel(null)).toBeNull();
    expect(chatterTierLabel(null)).toBeNull();
  });

  it("returns the human label for each viewer tier", () => {
    expect(viewerTierLabel("habitue")).toBe("Habitué");
    expect(viewerTierLabel("cinephile")).toBe("Cinéphile");
    expect(viewerTierLabel("connaisseur")).toBe("Connaisseur");
    expect(viewerTierLabel("cingle")).toBe("Cinglé");
    expect(viewerTierLabel("legende")).toBe("Légende");
  });

  it("returns the human label for each chatter tier", () => {
    expect(chatterTierLabel("bavard")).toBe("Bavard");
    expect(chatterTierLabel("animateur")).toBe("Animateur");
    expect(chatterTierLabel("voix")).toBe("Voix");
  });
});
