"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfilesByUsername } from "@/lib/use-profiles";
import UserChip from "./UserChip";

interface UserWatch {
  username: string;
  seconds: number;
}

function formatWatch(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function Classement() {
  const [scores, setScores] = useState<UserWatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchScores = async () => {
      const { data, error: err } = await supabase
        .from("watch_time")
        .select("username,seconds")
        .order("seconds", { ascending: false })
        .limit(5);
      if (cancelled) return;
      if (err) {
        console.error("[Classement] fetch error:", err);
        setError(true);
        setLoading(false);
        return;
      }
      setError(false);
      setScores((data ?? []) as UserWatch[]);
      setLoading(false);
    };

    fetchScores();
    const interval = setInterval(fetchScores, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchScores();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const usernames = useMemo(() => scores.map((s) => s.username), [scores]);
  const profileMap = useProfilesByUsername(usernames);

  return (
    <div className="p-10 max-md:p-6">
      <div className="text-[13px] font-semibold uppercase tracking-[0.16em] mb-5 flex justify-between items-baseline">
        <span>Classement</span>
        <span className="font-mono font-medium text-[11px] tracking-[0.04em] text-ink-3 normal-case">
          cette semaine
        </span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-[11px] text-ink-3 font-mono uppercase tracking-[0.12em]">
          chargement…
        </div>
      ) : error ? (
        <div className="py-8 text-center text-[11px] text-ink-3 font-mono uppercase tracking-[0.12em]">
          indisponible
        </div>
      ) : scores.length === 0 ? (
        <div className="py-8 text-center text-[11px] text-ink-3">
          personne encore
        </div>
      ) : (
        <div className="flex flex-col">
          {scores.map((row, i) => {
            const top = i < 3;
            return (
              <div
                key={row.username}
                className="py-2.5 grid grid-cols-[32px_1fr_auto] gap-3 items-center border-b border-line last:border-b-0"
              >
                <span
                  className={`font-mono font-semibold text-[13px] ${top ? "text-red" : "text-ink-4"}`}
                >
                  {(i + 1).toString().padStart(2, "0")}
                </span>
                <UserChip
                  username={row.username}
                  profile={profileMap.get(row.username.toLowerCase())}
                  size="sm"
                  className="text-[13px] font-medium text-ink"
                />
                <span className="font-mono font-medium text-[11px] text-ink-3">
                  {formatWatch(row.seconds)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
