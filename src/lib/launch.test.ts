import { afterEach, describe, it, expect, vi } from "vitest";
import { LAUNCH_ISO, isSiteLocked } from "@/lib/launch";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("isSiteLocked", () => {
  it("n'est jamais verrouillé hors production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect(isSiteLocked()).toBe(false);
  });

  it("verrouille en production avant la date de lancement", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.parse(LAUNCH_ISO) - 60_000));
    expect(isSiteLocked()).toBe(true);
  });

  it("déverrouille en production à partir de la date de lancement", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.parse(LAUNCH_ISO)));
    expect(isSiteLocked()).toBe(false);
  });
});
