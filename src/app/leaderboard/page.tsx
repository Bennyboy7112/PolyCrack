"use client";

import { useState, useEffect } from "react";
import type { Profile } from "@/types";
import { supabase } from "@/lib/supabase";

interface LeaderboardEntry extends Profile {
  profit: number;
  winRate: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("total_earned", { ascending: false })
      .limit(50);

    if (profiles) {
      const enriched = profiles.map((p: Record<string, unknown>) => ({
        ...p,
        profit: (p.total_earned as number) - 1000,
        winRate: (p.bets_placed as number) > 0 ? 0 : 0,
      })) as LeaderboardEntry[];
      setEntries(enriched);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Leaderboard</h1>
      <p className="text-poly-muted">
        Top traders ranked by total earnings
      </p>

      {loading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="glass h-16 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-lg text-poly-muted">No users yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className="glass flex items-center gap-4 rounded-xl p-4 transition hover:border-poly-highlight/30"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                  index === 0
                    ? "bg-yellow-500/20 text-yellow-500"
                    : index === 1
                      ? "bg-gray-300/20 text-gray-300"
                      : index === 2
                        ? "bg-orange-500/20 text-orange-500"
                        : "bg-poly-accent text-poly-muted"
                }`}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{entry.username}</div>
                <div className="text-xs text-poly-muted">
                  {entry.bets_placed} bets | {entry.markets_created} markets
                  created
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-poly-green">
                  {entry.total_earned.toLocaleString()} pts
                </div>
                <div
                  className={`text-xs ${entry.profit >= 0 ? "text-poly-green" : "text-poly-red"}`}
                >
                  {entry.profit >= 0 ? "+" : ""}
                  {entry.profit.toLocaleString()} profit
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
