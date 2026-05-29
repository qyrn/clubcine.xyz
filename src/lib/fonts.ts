export interface FontDef {
  slug: string;
  label: string;
  family: string;
  fallback: string;
  source: "google" | "local";
  note?: string;
}

export const FONTS: FontDef[] = [
  {
    slug: "default",
    label: "Défaut",
    family: "Inter",
    fallback: "system-ui, sans-serif",
    source: "google",
    note: "Sobre",
  },
  {
    slug: "marker",
    label: "Marker",
    family: "Permanent Marker",
    fallback: "cursive",
    source: "google",
    note: "Logo / feutre",
  },
  {
    slug: "lynchpin",
    label: "Lynchpin",
    family: "Lynchpin",
    fallback: "'Permanent Marker', serif",
    source: "local",
    note: "Stencil Lynch",
  },
  {
    slug: "erotica",
    label: "Erotica",
    family: "Erotica",
    fallback: "serif",
    source: "local",
    note: "Display courbes",
  },
  {
    slug: "apple-garamond",
    label: "Apple Garamond",
    family: "Apple Garamond",
    fallback: "Georgia, serif",
    source: "local",
    note: "Serif italique élégant",
  },
  {
    slug: "druk-wide",
    label: "Druk Wide",
    family: "Druk Wide",
    fallback: "Impact, sans-serif",
    source: "local",
    note: "Bold extra-large",
  },
  {
    slug: "instrument-serif",
    label: "Instrument Serif",
    family: "Instrument Serif",
    fallback: "Georgia, serif",
    source: "local",
    note: "Serif italique éditorial",
  },
  {
    slug: "mea-culpa",
    label: "Mea Culpa",
    family: "Mea Culpa",
    fallback: "cursive",
    source: "local",
    note: "Script calligraphique",
  },
  {
    slug: "vogue",
    label: "Vogue",
    family: "Vogue Custom",
    fallback: "serif",
    source: "local",
    note: "Serif mode chic",
  },
];

export function findFont(slug?: string | null): FontDef {
  if (!slug) return FONTS[0];
  return FONTS.find((f) => f.slug === slug) ?? FONTS[0];
}

export function fontStack(slug?: string | null): string {
  const f = findFont(slug);
  return `"${f.family}", ${f.fallback}`;
}

export const USERNAME_COLORS: { slug: string; label: string; value: string }[] = [
  { slug: "default", label: "Blanc", value: "var(--color-ink)" },
  { slug: "red", label: "Rouge", value: "var(--color-red)" },
  { slug: "cream", label: "Crème", value: "#f0eae0" },
  { slug: "amber", label: "Ambre", value: "#fbbf24" },
  { slug: "green", label: "Vert", value: "#86efac" },
  { slug: "blue", label: "Bleu", value: "#a5b4fc" },
  { slug: "rose", label: "Rose", value: "#fda4af" },
];

const HEX_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isHexColor(value?: string | null): boolean {
  return !!value && HEX_REGEX.test(value);
}

export function findColor(slug?: string | null): string {
  if (!slug) return USERNAME_COLORS[0].value;
  if (isHexColor(slug)) return slug;
  return (USERNAME_COLORS.find((c) => c.slug === slug) ?? USERNAME_COLORS[0]).value;
}
