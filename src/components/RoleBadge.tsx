"use client";

export type IconName =
  | "crown"
  | "star-filled"
  | "diamond"
  | "skull"
  | "bolt"
  | "eye"
  | "flame"
  | "tape"
  | "clapperboard"
  | "moon"
  | "trophy"
  | "ticket"
  | "popcorn"
  | "spark";

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 14, className }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "crown":
      return (
        <svg {...props}>
          <path d="M2 7l5 4 5-6 5 6 5-4-2 14H4L2 7zm3 10h14v2H5v-2z" />
        </svg>
      );
    case "star-filled":
      return (
        <svg {...props}>
          <path d="M12 2l2.9 6.9L22 10l-5.5 4.6L18.2 22 12 18.3 5.8 22l1.7-7.4L2 10l7.1-1.1L12 2z" />
        </svg>
      );
    case "diamond":
      return (
        <svg {...props}>
          <path d="M12 2l10 10-10 10L2 12 12 2zm0 4.5L5.5 12 12 18.5 18.5 12 12 6.5z" />
        </svg>
      );
    case "skull":
      return (
        <svg {...props}>
          <path d="M12 2C7 2 4 5.5 4 10v4l2 2v3a1 1 0 001 1h2v-3h2v3h2v-3h2v3h2a1 1 0 001-1v-3l2-2v-4c0-4.5-3-8-8-8zm-3 8a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...props}>
          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      );
    case "eye":
      return (
        <svg {...props}>
          <path d="M12 5C7 5 2.7 8.1 1 12c1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 12a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z" />
        </svg>
      );
    case "flame":
      return (
        <svg {...props}>
          <path d="M12 2c1 4 5 5 5 10a5 5 0 11-10 0c0-2 1-3 1-5 0 0 3 1 4-5zm-2 14a3 3 0 006 0c0-3-3-3-3-6-1 3-3 3-3 6z" />
        </svg>
      );
    case "tape":
      return (
        <svg {...props}>
          <path d="M3 6h18a1 1 0 011 1v10a1 1 0 01-1 1h-3l-1-2H7l-1 2H3a1 1 0 01-1-1V7a1 1 0 011-1zm5 4a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    case "clapperboard":
      return (
        <svg {...props}>
          <path d="M2 8l2-4h4l-2 4h3l2-4h4l-2 4h3l2-4h4l-2 4h2v12H2V8zm0 0v2h20V8H2z" />
        </svg>
      );
    case "moon":
      return (
        <svg {...props}>
          <path d="M21 13a9 9 0 11-10-10 7 7 0 0010 10z" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...props}>
          <path d="M7 3h10v2h3a1 1 0 011 1v3a4 4 0 01-4 4h-.4a5 5 0 01-3.6 3.9V19h3v2H8v-2h3v-2.1A5 5 0 017.4 13H7a4 4 0 01-4-4V6a1 1 0 011-1h3V3zm0 4H5v2a2 2 0 002 2V7zm10 0v4a2 2 0 002-2V7h-2z" />
        </svg>
      );
    case "ticket":
      return (
        <svg {...props}>
          <path d="M2 8a2 2 0 012-2h16a2 2 0 012 2v3a2 2 0 100 4v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3a2 2 0 100-4V8zm12-1v2h2V7h-2zm0 4v2h2v-2h-2zm0 4v2h2v-2h-2z" />
        </svg>
      );
    case "popcorn":
      return (
        <svg {...props}>
          <path d="M5 9a3 3 0 014-3 3 3 0 016 0 3 3 0 014 3l-1 12H6L5 9zm3 1l1 9h6l1-9H8z" />
        </svg>
      );
    case "spark":
      return (
        <svg {...props}>
          <path d="M12 2l1.5 7L21 11l-7.5 1.5L12 22l-1.5-9L3 11l7.5-1.5L12 2z" />
        </svg>
      );
  }
}

export const ROLE_ICONS: Record<string, { icon: IconName; color: string; label: string }> = {
  admin: { icon: "crown", color: "var(--color-red)", label: "ADMIN" },
  soutien: { icon: "star-filled", color: "var(--color-red)", label: "SOUTIEN" },
  equipe: { icon: "diamond", color: "var(--color-red)", label: "ÉQUIPE" },
  vip: { icon: "diamond", color: "var(--color-red)", label: "VIP" },
  pirate: { icon: "skull", color: "var(--color-red)", label: "PIRATE" },
};

export const BADGE_ICONS: Record<string, IconName> = {
  supporter: "star-filled",
  "founding-viewer": "spark",
  "night-owl": "moon",
  "top-10": "trophy",
  curator: "clapperboard",
  admin: "crown",
  "bug-hunter": "tape",
  "viewer-habitue": "eye",
  "viewer-cinephile": "popcorn",
  "viewer-connaisseur": "ticket",
  "viewer-cingle": "flame",
  "viewer-legende": "trophy",
  "chatter-bavard": "bolt",
  "chatter-animateur": "flame",
  "chatter-voix": "spark",
  "film-suggest-1": "clapperboard",
  "film-suggest-5": "clapperboard",
  "film-suggest-10": "clapperboard",
  "soiree-suggest-1": "ticket",
  "soiree-suggest-5": "ticket",
  "soiree-suggest-10": "ticket",
};

export const VIEWER_TIER_ICONS: Record<string, IconName> = {
  habitue: "eye",
  cinephile: "popcorn",
  connaisseur: "ticket",
  cingle: "flame",
  legende: "trophy",
};

export const CHATTER_TIER_ICONS: Record<string, IconName> = {
  bavard: "bolt",
  animateur: "flame",
  voix: "spark",
};

interface RoleBadgeProps {
  role: string;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function RoleBadge({ role, size = "sm", showLabel = false, className }: RoleBadgeProps) {
  const conf = ROLE_ICONS[role];
  if (!conf) return null;
  const px = size === "sm" ? 13 : 15;
  return (
    <span
      aria-label={conf.label}
      className={`relative inline-flex items-center align-middle gap-1 group/role ${className ?? ""}`.trim()}
      style={{ color: conf.color, lineHeight: 0 }}
    >
      <Icon name={conf.icon} size={px} className="translate-y-[0.5px]" />
      {showLabel && (
        <span className="font-mono text-[10px] tracking-[0.16em] uppercase font-bold leading-none">
          {conf.label}
        </span>
      )}
      {!showLabel && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-bg border border-line-2 rounded font-mono text-[11px] font-semibold tracking-[0.16em] uppercase whitespace-nowrap text-red opacity-0 translate-y-1 group-hover/role:opacity-100 group-hover/role:translate-y-0 transition-all duration-150 z-30 shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
        >
          {conf.label}
        </span>
      )}
    </span>
  );
}

interface BadgeIconProps {
  slug: string;
  size?: number;
  color?: string;
  className?: string;
}

export function BadgeIcon({ slug, size = 14, color, className }: BadgeIconProps) {
  const icon = BADGE_ICONS[slug] ?? "spark";
  return (
    <span style={{ color }} className={className}>
      <Icon name={icon} size={size} />
    </span>
  );
}

interface TierBadgeProps {
  kind: "viewer" | "chatter";
  tier: string;
  label: string;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function TierBadge({ kind, tier, label, size = "sm", showLabel = false, className }: TierBadgeProps) {
  const icon = (kind === "viewer" ? VIEWER_TIER_ICONS[tier] : CHATTER_TIER_ICONS[tier]) ?? "spark";
  const px = size === "sm" ? 13 : 15;
  return (
    <span
      aria-label={label}
      className={`relative inline-flex items-center align-middle gap-1 group/tier ${className ?? ""}`.trim()}
      style={{ color: "var(--color-ink-2)", lineHeight: 0 }}
    >
      <Icon name={icon} size={px} className="translate-y-[0.5px]" />
      {showLabel && (
        <span className="font-mono text-[10px] tracking-[0.16em] uppercase font-bold leading-none">
          {label}
        </span>
      )}
      {!showLabel && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-bg border border-line-2 rounded font-mono text-[11px] font-semibold tracking-[0.16em] uppercase whitespace-nowrap text-ink opacity-0 translate-y-1 group-hover/tier:opacity-100 group-hover/tier:translate-y-0 transition-all duration-150 z-30 shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
        >
          {label}
        </span>
      )}
    </span>
  );
}
