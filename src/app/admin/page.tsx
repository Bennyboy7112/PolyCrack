"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Profile, MarketWithOutcomes } from "@/types";

export default function AdminPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [markets, setMarkets] = useState<MarketWithOutcomes[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "markets">("users");
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/auth";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      window.location.href = "/";
      return;
    }

    loadData();
  }

  async function loadData() {
    setLoading(true);
    const supabase = getSupabase();

    const { data: usersData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: marketsData } = await supabase
      .from("markets")
      .select("*, outcomes(*), profiles!creator_id(username)")
      .order("created_at", { ascending: false });

    setUsers(usersData || []);
    setMarkets(marketsData || []);
    setLoading(false);
  }

  async function toggleAdmin(userId: string, currentStatus: boolean) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: !currentStatus })
      .eq("id", userId);

    if (error) {
      setMessage("Failed to update admin status");
    } else {
      setMessage("Admin status updated");
      loadData();
    }
  }

  async function adjustPoints(userId: string, amount: number) {
    const supabase = getSupabase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("points_balance")
      .eq("id", userId)
      .single();

    if (!profile) return;

    const newBalance = profile.points_balance + amount;
    const { error } = await supabase
      .from("profiles")
      .update({ points_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      setMessage("Failed to adjust points");
    } else {
      await supabase.from("transactions").insert({
        user_id: userId,
        type: amount > 0 ? "weekly_grant" : "bet_placed",
        amount,
        balance_after: newBalance,
        description: amount > 0 ? `Admin added ${amount} points` : `Admin removed ${Math.abs(amount)} points`,
      });
      setMessage("Points adjusted");
      loadData();
    }
  }

  async function deleteMarket(marketId: string) {
    if (!confirm("Delete this market?")) return;
    const supabase = getSupabase();
    const { error } = await supabase.from("markets").delete().eq("id", marketId);
    if (error) {
      setMessage("Failed to delete market");
    } else {
      setMessage("Market deleted");
      loadData();
    }
  }

  if (loading) {
    return <div className="space-y-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Panel</h1>
      {message && (
        <div className="glass rounded-lg p-3 text-poly-green text-sm">{message}</div>
      )}

      <div className="flex gap-2 border-b border-poly-border">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-2 px-3 text-sm font-medium ${
            activeTab === "users"
              ? "text-poly-highlight border-b-2 border-poly-highlight"
              : "text-poly-muted"
          }`}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("markets")}
          className={`pb-2 px-3 text-sm font-medium ${
            activeTab === "markets"
              ? "text-poly-highlight border-b-2 border-poly-highlight"
              : "text-poly-muted"
          }`}
        >
          Markets ({markets.length})
        </button>
      </div>

      {activeTab === "users" && (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-poly-muted border-b border-poly-border">
                <th className="p-3">User</th>
                <th className="p-3">Email</th>
                <th className="p-3">Points</th>
                <th className="p-3">Total Earned</th>
                <th className="p-3">Bets</th>
                <th className="p-3">Admin</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-poly-border/50">
                  <td className="p-3 font-medium">{user.username}</td>
                  <td className="p-3 text-sm text-poly-muted">{user.email}</td>
                  <td className="p-3 font-mono text-poly-green">{Math.floor(user.points_balance)}</td>
                  <td className="p-3 text-sm">{Math.floor(user.total_earned)}</td>
                  <td className="p-3 text-sm">{user.bets_placed}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        user.is_admin
                          ? "bg-poly-highlight/20 text-poly-highlight"
                          : "bg-poly-muted/20 text-poly-muted"
                      }`}
                    >
                      {user.is_admin ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAdmin(user.id, user.is_admin)}
                        className="px-2 py-1 text-xs rounded bg-poly-accent hover:bg-poly-highlight/20"
                      >
                        {user.is_admin ? "Remove Admin" : "Make Admin"}
                      </button>
                      <button
                        onClick={() => adjustPoints(user.id, 100)}
                        className="px-2 py-1 text-xs rounded bg-poly-green/20 hover:bg-poly-green/30 text-poly-green"
                      >
                        +100
                      </button>
                      <button
                        onClick={() => adjustPoints(user.id, -100)}
                        className="px-2 py-1 text-xs rounded bg-poly-red/20 hover:bg-poly-red/30 text-poly-red"
                      >
                        -100
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "markets" && (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-poly-muted border-b border-poly-border">
                <th className="p-3">Question</th>
                <th className="p-3">Category</th>
                <th className="p-3">Type</th>
                <th className="p-3">Creator</th>
                <th className="p-3">Volume</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market) => (
                <tr key={market.id} className="border-b border-poly-border/50">
                  <td className="p-3 max-w-xs truncate">{market.question}</td>
                  <td className="p-3 text-sm text-poly-muted">{market.category}</td>
                  <td className="p-3 text-sm">{market.market_type}</td>
                  <td className="p-3 text-sm">{market.profiles?.username}</td>
                  <td className="p-3 font-mono">${market.total_volume?.toLocaleString() || 0}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        market.resolved
                          ? "bg-poly-green/20 text-poly-green"
                          : "bg-poly-yellow/20 text-yellow-400"
                      }`}
                    >
                      {market.resolved ? "Resolved" : "Active"}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => deleteMarket(market.id)}
                      className="px-2 py-1 text-xs rounded bg-poly-red/20 hover:bg-poly-red/30 text-poly-red"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}