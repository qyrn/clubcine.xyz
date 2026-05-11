"use client";

import Link from "next/link";
import { PublicProfile } from "@/lib/use-profiles";
import { viewerTierLabel } from "@/lib/tiers";
import { ROLE_ICONS, RoleBadge, TierBadge } from "./RoleBadge";

interface Props {
  username: string;
  profile?: PublicProfile;
  size?: "sm" | "md";
  className?: string;
}

export default function UserChip({ username, profile, size = "sm", className }: Props) {
  const dim = size === "sm" ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-[11px]";
  const letter = username.trim().charAt(0).toUpperCase() || "?";
  const role = profile?.role ?? "spectateur";
  const hasRoleIcon = !!ROLE_ICONS[role];
  const tier = profile?.viewerTier ?? null;
  const tierLabel = viewerTierLabel(tier);

  return (
    <Link
      href={`/u/${encodeURIComponent(username)}`}
      className={`inline-flex items-center gap-1.5 hover:text-red transition-colors ${className ?? ""}`.trim()}
    >
      {profile?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatarUrl}
          alt=""
          className={`${dim} rounded-full object-cover border border-line-2 shrink-0`}
        />
      ) : (
        <span
          className={`${dim} rounded-full border border-line-2 flex items-center justify-center font-semibold text-ink shrink-0 bg-bg`}
        >
          {letter}
        </span>
      )}
      <span className="truncate">{username}</span>
      {hasRoleIcon ? (
        <RoleBadge role={role} size={size} className="shrink-0" />
      ) : tier && tierLabel ? (
        <TierBadge kind="viewer" tier={tier} label={tierLabel} size={size} className="shrink-0" />
      ) : null}
    </Link>
  );
}
