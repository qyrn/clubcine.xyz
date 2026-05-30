"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { BadgeIcon, badgeColor, useTooltipPos } from "./RoleBadge";

interface BadgeRow {
  slug: string;
  label: string;
  description: string;
  color: string;
}

interface UserBadgeRow {
  badge_slug: string;
  awarded_at: string;
  awarded_reason: string | null;
  badges: BadgeRow;
}

interface AwardedBadge extends BadgeRow {
  awardedAt: string;
  reason: string | null;
}

interface Props {
  userId: string;
}

function BadgeChip({ badge }: { badge: AwardedBadge }) {
  const [setRef, pos, show, hide] = useTooltipPos();
  const color = badgeColor(badge.slug, badge.color);
  const reason = badge.reason && badge.reason.trim().toLowerCase() !== "admin grant" ? badge.reason : null;
  const detail = reason ?? badge.description;

  return (
    <span
      ref={setRef}
      tabIndex={0}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      style={{ "--badge": color } as CSSProperties}
      className="relative inline-flex items-center gap-2 px-3 py-2 border border-line-2 rounded-md bg-bg cursor-default outline-none transition-colors hover:border-[var(--badge)] focus-visible:border-[var(--badge)]"
    >
      <BadgeIcon slug={badge.slug} size={16} color={color} />
      <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink">
        {badge.label}
      </span>
      {pos && (
        <span
          role="tooltip"
          style={{
            position: "fixed",
            top: pos.top - 8,
            left: pos.left,
            transform: "translate(-50%, -100%)",
          }}
          className="pointer-events-none z-50 w-max max-w-[240px] px-3 py-2 bg-bg border border-line-2 rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.6)] flex flex-col gap-1 text-left"
        >
          <span
            className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase"
            style={{ color }}
          >
            {badge.label}
          </span>
          {detail && (
            <span className="text-[11px] leading-[1.45] text-ink-2 normal-case tracking-normal">
              {detail}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export default function BadgeList({ userId }: Props) {
  const [badges, setBadges] = useState<AwardedBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("user_badges")
          .select("badge_slug,awarded_at,awarded_reason,badges(slug,label,description,color)")
          .eq("user_id", userId)
          .order("awarded_at", { ascending: false });
        if (cancelled) return;
        const rows = (data ?? []) as unknown as UserBadgeRow[];
        const list: AwardedBadge[] = rows
          .filter((r) => r.badges)
          .map((r) => ({
            ...r.badges,
            awardedAt: r.awarded_at,
            reason: r.awarded_reason,
          }));
        setBadges(list);
      } catch (e) {
        console.error("[BadgeList] load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="font-mono text-[12px] tracking-[0.04em] text-ink-3 uppercase">
        Chargement…
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <p className="text-[13px] text-ink-3 italic text-center text-balance">
        Aucun badge encore.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {badges.map((b) => (
        <BadgeChip key={b.slug} badge={b} />
      ))}
    </div>
  );
}
