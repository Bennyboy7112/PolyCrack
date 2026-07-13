"use client";

import { useState, useEffect } from "react";
import type { Profile, Transaction, Bet } from "@/types";
import { getSupabase } from "@/lib/supabase";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: betData } = await supabase
      .from("bets")
      .select("*, outcomes(label, market_id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    setProfile(profileData);
    setTransactions(txData || []);
    setBets(betData || []);
    setLoading(false);
  }

  async function handleClaimWeekly() {
    setClaiming(true);
    setMessage("");

    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const res = await fetch("/api/weekly-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });

    const result = await res.json();

    if (result.success) {
      setMessage("+100 points claimed!");
      fetchProfile();
    } else {
      setMessage(result.error || "Not ready to claim yet");
    }
    setClaiming(false);
  }

  async function handleSignOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass h-32 animate-pulse rounded-xl" />
        <div className="glass h-48 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <p className="mb-4 text-lg text-poly-muted">Not signed in</p>
        <a
          href="/auth"
          className="inline-block rounded-lg bg-poly-highlight px-6 py-2 text-white transition hover:bg-poly-highlight/80"
        >
          Sign In
        </a>
      </div>
    );
  }

  const canClaim = (() => {
    if (!profile.last_weekly_claim) return true;
    const last = new Date(profile.last_weekly_claim);
    const now = new Date();
    return (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24) >= 7;
  })();

  const profit = profile.total_earned - 1000;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="glass rounded-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{profile.username}</h1>
            <p className="text-sm text-poly-muted">{profile.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-lg border border-poly-border px-4 py-2 text-sm text-poly-muted transition hover:border-poly-red hover:text-poly-red"
          >
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-poly-accent/30 p-3 text-center">
            <div className="text-2xl font-bold text-poly-green">
              {Math.floor(profile.points_balance)}
            </div>
            <div className="text-xs text-poly-muted">Points Balance</div>
          </div>
          <div className="rounded-lg bg-poly-accent/30 p-3 text-center">
            <div className="text-2xl font-bold">
              {Math.floor(profile.total_earned)}
            </div>
            <div className="text-xs text-poly-muted">Total Earned</div>
          </div>
          <div className="rounded-lg bg-poly-accent/30 p-3 text-center">
            <div
              className={`text-2xl font-bold ${profit >= 0 ? "text-poly-green" : "text-poly-red"}`}
            >
              {profit >= 0 ? "+" : ""}
              {Math.floor(profit)}
            </div>
            <div className="text-xs text-poly-muted">Profit</div>
          </div>
          <div className="rounded-lg bg-poly-accent/30 p-3 text-center">
            <div className="text-2xl font-bold">{profile.bets_placed}</div>
            <div className="text-xs text-poly-muted">Bets Placed</div>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Weekly Allowance</h3>
            <p className="text-sm text-poly-muted">
              Get 100 points every 7 days
            </p>
          </div>
          <button
            onClick={handleClaimWeekly}
            disabled={!canClaim || claiming}
            className="rounded-lg bg-poly-green px-4 py-2 font-semibold text-white transition hover:bg-poly-green/80 disabled:opacity-50 disabled:hover:bg-poly-green"
          >
            {claiming
              ? "Claiming..."
              : canClaim
                ? "Claim +100"
                : "Claimed"}
          </button>
        </div>
        {message && (
          <p className="mt-2 text-center text-sm text-poly-muted">{message}</p>
        )}
      </div>

      <div className="glass rounded-xl p-4">
        <h3 className="mb-3 font-semibold">Recent Bets</h3>
        {bets.length === 0 ? (
          <p className="text-sm text-poly-muted">No bets yet</p>
        ) : (
          <div className="space-y-2">
            {bets.map((bet) => (
              <div
                key={bet.id}
                className="flex items-center justify-between rounded-lg bg-poly-bg/50 p-3 text-sm"
              >
                <div>
                  <span className="text-poly-muted">
                    {(bet as any).outcomes?.label || "Unknown"}
                  </span>
                  <span className="mx-2 text-poly-border">|</span>
                  <span>{bet.amount} pts</span>
                </div>
                <div>
                  {bet.resolved ? (
                    bet.won ? (
                      <span className="font-bold text-poly-green">
                        +{bet.payout.toFixed(0)} pts
                      </span>
                    ) : (
                      <span className="text-poly-red">Lost</span>
                    )
                  ) : (
                    <span className="text-poly-muted">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-4">
        <h3 className="mb-3 font-semibold">Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-poly-muted">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg bg-poly-bg/50 p-3 text-sm"
              >
                <div>
                  <span className="text-poly-muted">{tx.description}</span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold ${tx.amount >= 0 ? "text-poly-green" : "text-poly-red"}`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount}
                  </span>
                  <div className="text-xs text-poly-muted">
                    Bal: {Math.floor(tx.balance_after)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
