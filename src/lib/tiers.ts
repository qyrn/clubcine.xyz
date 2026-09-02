export type ViewerTier =
  | "habitue"
  | "cinephile"
  | "connaisseur"
  | "cingle"
  | "legende";

export type ChatterTier = "bavard" | "animateur" | "voix";

const VIEWER_THRESHOLDS: { tier: ViewerTier; seconds: number; label: string }[] = [
  { tier: "legende",     seconds: 500 * 3600, label: "Légende" },
  { tier: "cingle",      seconds: 200 * 3600, label: "Cinglé" },
  { tier: "connaisseur", seconds: 50 * 3600,  label: "Connaisseur" },
  { tier: "cinephile",   seconds: 10 * 3600,  label: "Cinéphile" },
  { tier: "habitue",     seconds: 1 * 3600,   label: "Habitué" },
];

const CHATTER_THRESHOLDS: { tier: ChatterTier; count: number; label: string }[] = [
  { tier: "voix",      count: 200, label: "Voix" },
  { tier: "animateur", count: 50,  label: "Animateur" },
  { tier: "bavard",    count: 10,  label: "Bavard" },
];

export function viewerTier(seconds: number): ViewerTier | null {
  for (const t of VIEWER_THRESHOLDS) {
    if (seconds >= t.seconds) return t.tier;
  }
  return null;
}

export function viewerTierLabel(tier: ViewerTier | null): string | null {
  if (!tier) return null;
  return VIEWER_THRESHOLDS.find((t) => t.tier === tier)?.label ?? null;
}

export function chatterTier(count: number): ChatterTier | null {
  for (const t of CHATTER_THRESHOLDS) {
    if (count >= t.count) return t.tier;
  }
  return null;
}

export function chatterTierLabel(tier: ChatterTier | null): string | null {
  if (!tier) return null;
  return CHATTER_THRESHOLDS.find((t) => t.tier === tier)?.label ?? null;
}
