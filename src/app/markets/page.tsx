"use client";

import { useState, useEffect } from "react";
import type { MarketWithOutcomes } from "@/types";
import { getSupabase } from "@/lib/supabase";

const CATEGORIES = [
  "all",
  "politics",
  "sports",
  "crypto",
  "tech",
  "entertainment",
  "science",
  "general",
];

export default function MarketsPage() {
  const [markets, setMarkets] = useState<MarketWithOutcomes[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    fetchMarkets();
  }, [category, showResolved]);

  async function fetchMarkets() {
    setLoading(true);
    const supabase = getSupabase();
    let query = supabase
      .from("markets")
      .select("*, outcomes(*), profiles!creator_id(username)")
      .order("created_at", { ascending: false });

    if (category !== "all") {
      query = query.eq("category", category);
    }
    query = query.eq("resolved", showResolved);

    const { data } = await query;
    setMarkets(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Markets</h1>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              category === cat
                ? "bg-poly-highlight text-white"
                : "glass text-poly-muted hover:text-white"
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowResolved(false)}
          className={`text-sm ${!showResolved ? "font-bold text-white" : "text-poly-muted"}`}
        >
          Active
        </button>
        <button
          onClick={() => setShowResolved(true)}
          className={`text-sm ${showResolved ? "font-bold text-white" : "text-poly-muted"}`}
        >
          Resolved
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass h-48 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-lg text-poly-muted">No markets found</p>
          <a
            href="/create"
            className="mt-4 inline-block rounded-lg bg-poly-highlight px-6 py-2 text-white transition hover:bg-poly-highlight/80"
          >
            Create a market
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}

function MarketCard({ market }: { market: MarketWithOutcomes }) {
  const topOutcomes = market.outcomes?.slice(0, 3) || [];
  const volume = market.total_volume?.toLocaleString() || "0";
  const endDate = new Date(market.end_date);
  const timeLeft = market.resolved
    ? "Resolved"
    : `Ends ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <a
      href={`/markets/${market.id}`}
      className={`glass block rounded-xl p-4 transition hover:border-poly-highlight/50 hover:shadow-lg hover:shadow-poly-highlight/10 ${
        market.resolved ? "opacity-70" : ""
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-poly-accent px-2 py-0.5 text-xs text-poly-muted">
          {market.category}
        </span>
        {market.resolved && (
          <span className="rounded bg-poly-green/20 px-2 py-0.5 text-xs text-poly-green">
            Resolved
          </span>
        )}
      </div>
      <h3 className="mb-3 line-clamp-2 text-base font-semibold">
        {market.question}
      </h3>
      <div className="mb-3 space-y-2">
        {topOutcomes.map((outcome) => (
          <div key={outcome.id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-poly-muted">{outcome.label}</span>
              <span className="font-mono font-bold">
                {Math.round(outcome.price * 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-poly-border">
              <div
                className={`h-full rounded-full transition-all ${
                  outcome.is_yes || outcome.label === "Yes"
                    ? "bg-poly-green"
                    : outcome.label === "No"
                      ? "bg-poly-red"
                      : "bg-poly-highlight"
                }`}
                style={{ width: `${outcome.price * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-poly-border pt-3 text-xs text-poly-muted">
        <span>${volume} volume</span>
        <span>{timeLeft}</span>
      </div>
    </a>
  );
}
