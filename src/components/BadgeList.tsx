"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BadgeIcon } from "./RoleBadge";

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
    <div className="flex flex-wrap gap-3 justify-center">
      {badges.map((b) => (
        <div
          key={b.slug}
          title={b.reason ?? b.description}
          className="flex items-center gap-2 px-3 py-2 border border-line-2 rounded-md bg-bg hover:border-line-2 transition-colors"
        >
          <BadgeIcon slug={b.slug} size={16} color={b.color} />
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink">
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}
