"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface DonationStats {
  total: number;
  thisMonth: number;
  loading: boolean;
  error: boolean;
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function useDonationStats(): DonationStats {
  const [state, setState] = useState<DonationStats>({
    total: 0,
    thisMonth: 0,
    loading: true,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;
    const monthStartIso = startOfMonth().toISOString();

    const load = async () => {
      const [{ count: total, error: e1 }, { count: month, error: e2 }] = await Promise.all([
        supabase.from("donations").select("id", { count: "exact", head: true }),
        supabase
          .from("donations")
          .select("id", { count: "exact", head: true })
          .gte("created_at", monthStartIso),
      ]);
      if (cancelled) return;
      if (e1 || e2) {
        setState((s) => ({ ...s, loading: false, error: true }));
        return;
      }
      setState({ total: total ?? 0, thisMonth: month ?? 0, loading: false, error: false });
    };
    load();

    const channel = supabase
      .channel("donations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "donations" },
        (payload) => {
          const createdAt = (payload.new as { created_at?: string }).created_at;
          const inMonth = createdAt ? new Date(createdAt) >= startOfMonth() : true;
          setState((s) => ({
            ...s,
            total: s.total + 1,
            thisMonth: s.thisMonth + (inMonth ? 1 : 0),
          }));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}
