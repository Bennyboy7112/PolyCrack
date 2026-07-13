import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { marketId, winningOutcomeId } = await request.json();

    if (!marketId || !winningOutcomeId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data: market } = await supabase
      .from("markets")
      .select("*")
      .eq("id", marketId)
      .single();

    if (!market) {
      return NextResponse.json(
        { error: "Market not found" },
        { status: 404 }
      );
    }

    if (market.resolved) {
      return NextResponse.json(
        { error: "Market already resolved" },
        { status: 400 }
      );
    }

    const { error: marketError } = await supabase
      .from("markets")
      .update({
        resolved: true,
        winning_outcome_id: winningOutcomeId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", marketId);

    if (marketError) {
      return NextResponse.json(
        { error: "Failed to resolve market" },
        { status: 500 }
      );
    }

    const { data: bets } = await supabase
      .from("bets")
      .select("*")
      .eq("market_id", marketId)
      .eq("resolved", false);

    if (bets) {
      for (const bet of bets) {
        const won = bet.outcome_id === winningOutcomeId;
        const payout = won ? bet.shares * 1 : 0;

        await supabase
          .from("bets")
          .update({ resolved: true, won, payout })
          .eq("id", bet.id);

        if (won && payout > 0) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("points_balance, total_earned")
            .eq("id", bet.user_id)
            .single();

          if (userProfile) {
            const newBalance = userProfile.points_balance + payout;
            await supabase
              .from("profiles")
              .update({
                points_balance: newBalance,
                total_earned: userProfile.total_earned + payout,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resolve API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
