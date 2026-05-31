export const LAUNCH_ISO = "2026-06-01T21:00:00+02:00";
const LAUNCH_MS = Date.parse(LAUNCH_ISO);

export function isSiteLocked(): boolean {
  return process.env.NODE_ENV === "production" && Date.now() < LAUNCH_MS;
}
