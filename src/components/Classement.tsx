"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UserScore {
  username: string;
  count: number;
}

export default function Classement() {
  const [scores, setScores] = useState<UserScore[]>([]);

  useEffect(() => {
    const fetchScores = async () => {
      const { data } = await supabase
        .from("messages")
        .select("username");
      if (!data) return;

      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.username] = (counts[row.username] || 0) + 1;
      }

      const sorted = Object.entries(counts)
        .map(([username, count]) => ({ username, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setScores(sorted);
    };

    fetchScores();
    const interval = setInterval(fetchScores, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-white/70 font-[var(--font-ui)] uppercase tracking-wide">
          classement
        </span>
        <span className="text-[10px] text-muted font-[var(--font-ui)]">top 5</span>
      </div>

      {scores.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-[11px] text-white/50 font-[var(--font-ui)] uppercase tracking-wide mb-1">
            pas encore de donnees
          </div>
          <div className="text-[10px] text-muted">
            envoyez des messages pour apparaitre ici
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {scores.map((user, i) => (
            <div key={user.username} className="py-2.5 flex items-center gap-3">
              <span className="text-[12px] text-muted font-[var(--font-ui)] w-[20px] shrink-0">
                {i + 1}.
              </span>
              <span className="text-[13px] text-white/70 flex-1 truncate">
                {user.username}
              </span>
              <span className="text-[10px] text-muted font-[var(--font-ui)]">
                {user.count} msg
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border text-[10px] text-muted font-[var(--font-ui)] text-center">
        1 msg = 1pt
      </div>
    </div>
  );
}
