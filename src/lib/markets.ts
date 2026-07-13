import { supabase } from "./supabase";
import type { Market, Outcome, MarketWithOutcomes } from "@/types";

export async function getMarkets(
  category?: string,
  resolved?: boolean,
  limit = 20,
  offset = 0
): Promise<MarketWithOutcomes[]> {
  let query = supabase
    .from("markets")
    .select("*, outcomes(*), profiles!creator_id(username, avatar_url)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }
  if (resolved !== undefined) {
    query = query.eq("resolved", resolved);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching markets:", error);
    return [];
  }
  return data || [];
}

export async function getMarketById(
  marketId: string
): Promise<MarketWithOutcomes | null> {
  const { data, error } = await supabase
    .from("markets")
    .select("*, outcomes(*), profiles!creator_id(username, avatar_url)")
    .eq("id", marketId)
    .single();

  if (error) {
    console.error("Error fetching market:", error);
    return null;
  }
  return data;
}

export async function createMarket(
  question: string,
  description: string,
  category: string,
  marketType: "binary" | "multi",
  endDate: string,
  outcomeLabels: string[],
  creatorId: string
): Promise<Market | null> {
  const initialPrice =
    marketType === "binary" ? 0.5 : 1 / outcomeLabels.length;

  const { data: market, error: marketError } = await supabase
    .from("markets")
    .insert({
      creator_id: creatorId,
      question,
      description,
      category,
      market_type: marketType,
      end_date: endDate,
      resolved: false,
      total_volume: 0,
    })
    .select()
    .single();

  if (marketError) {
    console.error("Error creating market:", marketError);
    return null;
  }

  const outcomes = outcomeLabels.map((label) => ({
    market_id: market.id,
    label,
    price: initialPrice,
    is_yes: marketType === "binary" ? label === "Yes" : undefined,
    total_bets: 0,
    total_amount: 0,
  }));

  const { error: outcomesError } = await supabase
    .from("outcomes")
    .insert(outcomes);

  if (outcomesError) {
    console.error("Error creating outcomes:", outcomesError);
    return null;
  }

  const profile = await supabase
    .from("profiles")
    .select("markets_created, points_balance")
    .eq("id", creatorId)
    .single();

  if (profile.data) {
    await supabase
      .from("profiles")
      .update({
        markets_created: profile.data.markets_created + 1,
        points_balance: profile.data.points_balance - 10,
        updated_at: new Date().toISOString(),
      })
      .eq("id", creatorId);

    await supabase.from("transactions").insert({
      user_id: creatorId,
      type: "market_created",
      amount: -10,
      balance_after: profile.data.points_balance - 10,
      market_id: market.id,
      description: `Created market: ${question.slice(0, 50)}`,
    });
  }

  return market;
}

export async function placeBet(
  userId: string,
  outcomeId: string,
  marketId: string,
  amount: number,
  price: number
): Promise<boolean> {
  const profile = await supabase
    .from("profiles")
    .select("points_balance")
    .eq("id", userId)
    .single();

  if (!profile.data || profile.data.points_balance < amount) {
    return false;
  }

  const shares = amount / price;
  const newBalance = profile.data.points_balance - amount;

  const { error: betError } = await supabase.from("bets").insert({
    user_id: userId,
    outcome_id: outcomeId,
    market_id: marketId,
    amount,
    price,
    shares,
    resolved: false,
    won: null,
    payout: 0,
  });

  if (betError) {
    console.error("Error placing bet:", betError);
    return false;
  }

  await supabase
    .from("profiles")
    .update({
      points_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  const outcome = await supabase
    .from("outcomes")
    .select("price, total_bets, total_amount")
    .eq("id", outcomeId)
    .single();

  if (outcome.data) {
    const newTotalBets = outcome.data.total_bets + 1;
    const newTotalAmount = outcome.data.total_amount + amount;

    const supplyBought = shares;
    const totalSharesEstimate = newTotalAmount / outcome.data.price;
    const newPrice = Math.min(
      0.99,
      Math.max(0.01, supplyBought / (totalSharesEstimate + supplyBought))
    );

    await supabase
      .from("outcomes")
      .update({
        price: newPrice,
        total_bets: newTotalBets,
        total_amount: newTotalAmount,
      })
      .eq("id", outcomeId);
  }

  const market = await supabase
    .from("markets")
    .select("total_volume")
    .eq("id", marketId)
    .single();

  if (market.data) {
    await supabase
      .from("markets")
      .update({ total_volume: market.data.total_volume + amount })
      .eq("id", marketId);
  }

  await supabase.from("transactions").insert({
    user_id: userId,
    type: "bet_placed",
    amount: -amount,
    balance_after: newBalance,
    market_id: marketId,
    description: `Bet placed on market`,
  });

  return true;
}

export async function resolveMarket(
  marketId: string,
  winningOutcomeId: string
): Promise<boolean> {
  const { error: marketError } = await supabase
    .from("markets")
    .update({
      resolved: true,
      winning_outcome_id: winningOutcomeId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", marketId);

  if (marketError) {
    console.error("Error resolving market:", marketError);
    return false;
  }

  const bets = await supabase
    .from("bets")
    .select("*, outcomes(price)")
    .eq("market_id", marketId)
    .eq("resolved", false);

  if (bets.data) {
    for (const bet of bets.data) {
      const won = bet.outcome_id === winningOutcomeId;
      const payout = won ? bet.shares * 1 : 0;

      await supabase
        .from("bets")
        .update({ resolved: true, won, payout })
        .eq("id", bet.id);

      if (won && payout > 0) {
        const profile = await supabase
          .from("profiles")
          .select("points_balance, total_earned")
          .eq("id", bet.user_id)
          .single();

        if (profile.data) {
          const newBalance = profile.data.points_balance + payout;
          await supabase
            .from("profiles")
            .update({
              points_balance: newBalance,
              total_earned: profile.data.total_earned + payout,
              updated_at: new Date().toISOString(),
            })
            .eq("id", bet.user_id);

          await supabase.from("transactions").insert({
            user_id: bet.user_id,
            type: "bet_won",
            amount: payout,
            balance_after: newBalance,
            market_id: marketId,
            description: `Won ${payout.toFixed(2)} points!`,
          });
        }
      }
    }
  }

  return true;
}
