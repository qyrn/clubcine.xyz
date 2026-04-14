"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UserWatch {
  username: string;
  minutes: number;
}

const TITLES = [
  "spectateur",
  "habitué",
  "cinéphile",
  "projectionniste",
  "fantôme de la salle",
];

function getTitle(minutes: number): string {
  if (minutes >= 600) return TITLES[4];
  if (minutes >= 240) return TITLES[3];
  if (minutes >= 60) return TITLES[2];
  if (minutes >= 15) return TITLES[1];
  return TITLES[0];
}

function formatWatch(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
  }
  return `${minutes}min`;
}

export default function Classement() {
  const [scores, setScores] = useState<UserWatch[]>([]);

  useEffect(() => {
    const fetchScores = async () => {
      const { data } = await supabase
        .from("watch_time")
        .select("username,seconds")
        .order("seconds", { ascending: false })
        .limit(5);
      if (!data) return;

      setScores(
        data.map((row) => ({
          username: row.username,
          minutes: Math.floor(row.seconds / 60),
        }))
      );
    };

    fetchScores();
    const interval = setInterval(fetchScores, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] text-muted uppercase tracking-wide">
          classement
        </span>
        <span className="text-[10px] text-dim font-[var(--font-mono)]">top 5</span>
      </div>

      {scores.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-[11px] text-muted italic">
            personne encore...
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {scores.map((user, i) => (
            <div key={user.username} className="py-3 flex items-start gap-3">
              <span className="text-[14px] text-dim font-[var(--font-title)] italic w-[20px] shrink-0">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-[#d4cfc7] truncate">
                  {user.username}
                </div>
                <div className="text-[10px] text-warm/60 italic mt-0.5">
                  {getTitle(user.minutes)}
                </div>
              </div>
              <span className="text-[10px] text-dim font-[var(--font-mono)] shrink-0 pt-0.5">
                {formatWatch(user.minutes)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border text-[10px] text-dim text-center space-y-1">
        <div>spectateur &rarr; habitué &rarr; cinéphile</div>
        <div>&rarr; projectionniste &rarr; fantôme de la salle</div>
      </div>
    </div>
  );
}
