"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { MarketWithOutcomes, Bet } from "@/types";
import { getSupabase } from "@/lib/supabase";

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params.id as string;
  const [market, setMarket] = useState<MarketWithOutcomes | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchMarket();
  }, [marketId]);

  async function fetchMarket() {
    setLoading(true);
    const supabase = getSupabase();
    const { data } = await supabase
      .from("markets")
      .select("*, outcomes(*), profiles!creator_id(username)")
      .eq("id", marketId)
      .single();
    setMarket(data);
    setLoading(false);
  }

  async function handlePlaceBet() {
    if (!selectedOutcome || !market) return;
    setPlacing(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please sign in to place a bet");
      setPlacing(false);
      return;
    }

    const outcome = market.outcomes.find((o) => o.id === selectedOutcome);
    if (!outcome) return;

    const res = await fetch("/api/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcomeId: selectedOutcome,
        marketId: market.id,
        amount: betAmount,
        price: outcome.price,
      }),
    });

    const result = await res.json();

    if (result.success) {
      setMessage(`Bet placed! ${betAmount} points on ${outcome.label}`);
      fetchMarket();
    } else {
      setMessage(result.error || "Failed to place bet");
    }
    setPlacing(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass h-12 w-2/3 animate-pulse rounded-xl" />
        <div className="glass h-64 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <p className="text-lg text-poly-muted">Market not found</p>
      </div>
    );
  }

  const volume = market.total_volume?.toLocaleString() || "0";
  const endDate = new Date(market.end_date);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-poly-accent px-2 py-0.5 text-xs text-poly-muted">
            {market.category}
          </span>
          <span className="text-xs text-poly-muted">
            {market.market_type === "binary" ? "Binary Market" : "Multi-Outcome"}
          </span>
          {market.resolved && (
            <span className="rounded bg-poly-green/20 px-2 py-0.5 text-xs text-poly-green">
              Resolved
            </span>
          )}
        </div>
        <h1 className="mb-2 text-2xl font-bold">{market.question}</h1>
        {market.description && (
          <p className="text-poly-muted">{market.description}</p>
        )}
      </div>

      <div className="glass rounded-xl p-4">
        <div className="mb-4 flex items-center justify-between text-sm text-poly-muted">
          <span>Total volume: ${volume}</span>
          <span>
            {market.resolved ? "Resolved" : `Ends ${endDate.toLocaleDateString()}`}
          </span>
        </div>

        <div className="space-y-3">
          {market.outcomes.map((outcome) => {
            const isSelected = selectedOutcome === outcome.id;
            const pct = Math.round(outcome.price * 100);
            return (
              <button
                key={outcome.id}
                onClick={() => setSelectedOutcome(outcome.id)}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  isSelected
                    ? "border-poly-highlight bg-poly-highlight/10"
                    : "border-poly-border hover:border-poly-highlight/50"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">{outcome.label}</span>
                  <span className="text-lg font-bold">{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-poly-border">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      outcome.is_yes || outcome.label === "Yes"
                        ? "bg-poly-green"
                        : outcome.label === "No"
                          ? "bg-poly-red"
                          : "bg-poly-highlight"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-poly-muted">
                  Price: {outcome.price.toFixed(2)} pts |{" "}
                  {outcome.total_bets} bets
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedOutcome && !market.resolved && (
        <div className="glass rounded-xl p-4">
          <h3 className="mb-3 font-semibold">Place a Bet</h3>
          <div className="mb-3 flex items-center gap-2">
            {[10, 25, 50, 100].map((amt) => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                className={`rounded-lg px-3 py-1 text-sm transition ${
                  betAmount === amt
                    ? "bg-poly-highlight text-white"
                    : "glass text-poly-muted"
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              min={1}
              className="w-32 rounded-lg border border-poly-border bg-poly-bg px-3 py-2 text-white outline-none focus:border-poly-highlight"
            />
            <span className="text-sm text-poly-muted">points</span>
          </div>
          <div className="mb-3 text-sm text-poly-muted">
            Potential payout:{" "}
            <span className="font-bold text-poly-green">
              {(betAmount / market.outcomes.find((o) => o.id === selectedOutcome)!.price).toFixed(2)} points
            </span>
          </div>
          <button
            onClick={handlePlaceBet}
            disabled={placing || betAmount <= 0}
            className="w-full rounded-lg bg-poly-highlight py-3 font-semibold text-white transition hover:bg-poly-highlight/80 disabled:opacity-50"
          >
            {placing ? "Placing Bet..." : "Place Bet"}
          </button>
          {message && (
            <p className="mt-2 text-center text-sm text-poly-muted">{message}</p>
          )}
        </div>
      )}

      <div className="glass rounded-xl p-4">
        <h3 className="mb-3 font-semibold">Market Info</h3>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-poly-muted">Created by</dt>
          <dd>{(market as any).profiles?.username || "Unknown"}</dd>
          <dt className="text-poly-muted">Market Type</dt>
          <dd>{market.market_type === "binary" ? "Binary (Yes/No)" : "Multi-Outcome"}</dd>
          <dt className="text-poly-muted">Total Volume</dt>
          <dd>${volume}</dd>
          <dt className="text-poly-muted">End Date</dt>
          <dd>{endDate.toLocaleDateString()}</dd>
        </dl>
      </div>
    </div>
  );
}
