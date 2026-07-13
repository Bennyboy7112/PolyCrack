"use client";

import { useState, useEffect } from "react";
import type { MarketWithOutcomes } from "@/types";
import { supabase } from "@/lib/supabase";

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

export default function HomePage() {
  const [markets, setMarkets] = useState<MarketWithOutcomes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets();
  }, []);

  async function fetchMarkets() {
    setLoading(true);
    const { data } = await supabase
      .from("markets")
      .select("*, outcomes(*), profiles!creator_id(username)")
      .eq("resolved", false)
      .order("total_volume", { ascending: false })
      .limit(12);
    setMarkets(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="mb-2 text-5xl font-bold">
          Poly<span className="text-poly-highlight">Crack</span>
        </h1>
        <p className="text-lg text-poly-muted">
          Predict outcomes. Earn points. Prove your knowledge.
        </p>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-poly-muted">
          <div className="glass rounded-lg px-4 py-2">
            <span className="font-bold text-poly-green">1000</span> starting
            points
          </div>
          <div className="glass rounded-lg px-4 py-2">
            <span className="font-bold text-poly-green">+100</span> points per
            week
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Trending Markets</h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass h-48 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : markets.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-lg text-poly-muted">No markets yet</p>
            <a
              href="/create"
              className="mt-4 inline-block rounded-lg bg-poly-highlight px-6 py-2 text-white transition hover:bg-poly-highlight/80"
            >
              Create the first market
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {markets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">How It Works</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              title: "Start with 1000 Points",
              desc: "Every user begins with 1000 points to trade on prediction markets.",
              icon: "1",
            },
            {
              title: "Trade on Outcomes",
              desc: "Buy Yes/No shares at probability-based prices. Prices move with supply and demand.",
              icon: "2",
            },
            {
              title: "Win Points",
              desc: "Correct predictions pay out 1 point per share. Climb the leaderboard!",
              icon: "3",
            },
          ].map((item) => (
            <div key={item.icon} className="glass rounded-xl p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-poly-highlight text-lg font-bold">
                {item.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
              <p className="text-sm text-poly-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MarketCard({ market }: { market: MarketWithOutcomes }) {
  const topOutcomes = market.outcomes?.slice(0, 3) || [];
  const volume = market.total_volume?.toLocaleString() || "0";
  const endDate = new Date(market.end_date);
  const timeLeft = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <a
      href={`/markets/${market.id}`}
      className="glass block rounded-xl p-4 transition hover:border-poly-highlight/50 hover:shadow-lg hover:shadow-poly-highlight/10"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-poly-accent px-2 py-0.5 text-xs text-poly-muted">
          {market.category}
        </span>
        <span className="text-xs text-poly-muted">
          {market.market_type === "binary" ? "Yes/No" : "Multi"}
        </span>
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
        <span>Ends {timeLeft}</span>
      </div>
    </a>
  );
}
