import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { outcomeId, marketId, amount, price } = body;

    if (!outcomeId || !marketId || !amount || !price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("points_balance")
      .eq("id", user.id)
      .single();

    if (!profile || profile.points_balance < amount) {
      return NextResponse.json(
        { error: "Insufficient points" },
        { status: 400 }
      );
    }

    const shares = amount / price;
    const newBalance = profile.points_balance - amount;

    const { error: betError } = await supabase.from("bets").insert({
      user_id: user.id,
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
      return NextResponse.json(
        { error: "Failed to place bet" },
        { status: 500 }
      );
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("bets_placed")
      .eq("id", user.id)
      .single();

    await supabase
      .from("profiles")
      .update({
        points_balance: newBalance,
        bets_placed: (currentProfile?.bets_placed || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    const { data: outcome } = await supabase
      .from("outcomes")
      .select("price, total_bets, total_amount")
      .eq("id", outcomeId)
      .single();

    if (outcome) {
      const newTotalBets = outcome.total_bets + 1;
      const newTotalAmount = outcome.total_amount + amount;

      const totalSharesEstimate =
        outcome.total_amount > 0
          ? outcome.total_amount / outcome.price
          : 1000;
      const newPrice = Math.min(
        0.99,
        Math.max(0.01, shares / (totalSharesEstimate + shares))
      );

      await supabase
        .from("outcomes")
        .update({
          price: newPrice,
          total_bets: newTotalBets,
          total_amount: newTotalAmount,
        })
        .eq("id", outcomeId);

      const otherOutcomes = await supabase
        .from("outcomes")
        .select("id, price")
        .eq("market_id", marketId)
        .neq("id", outcomeId);

      if (otherOutcomes.data && otherOutcomes.data.length > 0) {
        const remainingProb = 1 - newPrice;
        const otherTotalPrice = otherOutcomes.data.reduce(
          (sum, o) => sum + o.price,
          0
        );

        for (const other of otherOutcomes.data) {
          const scaledPrice =
            otherTotalPrice > 0
              ? (other.price / otherTotalPrice) * remainingProb
              : remainingProb / otherOutcomes.data.length;

          await supabase
            .from("outcomes")
            .update({ price: Math.max(0.01, scaledPrice) })
            .eq("id", other.id);
        }
      }
    }

    const { data: market } = await supabase
      .from("markets")
      .select("total_volume")
      .eq("id", marketId)
      .single();

    if (market) {
      await supabase
        .from("markets")
        .update({ total_volume: market.total_volume + amount })
        .eq("id", marketId);
    }

    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "bet_placed",
      amount: -amount,
      balance_after: newBalance,
      market_id: marketId,
      description: `Bet placed`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bet API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const {
      question,
      description,
      category,
      marketType,
      endDate,
      outcomes: outcomeLabels,
      creatorId,
    } = body;

    if (!question || !endDate || !outcomeLabels || !creatorId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("points_balance")
      .eq("id", creatorId)
      .single();

    if (!profile || profile.points_balance < 10) {
      return NextResponse.json(
        { error: "Insufficient points (need 10 to create a market)" },
        { status: 400 }
      );
    }

    const { data: market, error: marketError } = await supabase
      .from("markets")
      .insert({
        creator_id: creatorId,
        question,
        description: description || "",
        category: category || "general",
        market_type: marketType || "binary",
        end_date: endDate,
        resolved: false,
        total_volume: 0,
      })
      .select()
      .single();

    if (marketError) {
      return NextResponse.json(
        { error: "Failed to create market" },
        { status: 500 }
      );
    }

    const initialPrice = 1 / outcomeLabels.length;
    const outcomes = outcomeLabels.map((label: string) => ({
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
      return NextResponse.json(
        { error: "Failed to create outcomes" },
        { status: 500 }
      );
    }

    const newBalance = profile.points_balance - 10;

    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("markets_created")
      .eq("id", creatorId)
      .single();

    await supabase
      .from("profiles")
      .update({
        points_balance: newBalance,
        markets_created: (creatorProfile?.markets_created || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", creatorId);

    await supabase.from("transactions").insert({
      user_id: creatorId,
      type: "market_created",
      amount: -10,
      balance_after: newBalance,
      market_id: market.id,
      description: `Created: ${question.slice(0, 50)}`,
    });

    return NextResponse.json({ success: true, marketId: market.id });
  } catch (error) {
    console.error("Create market API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
