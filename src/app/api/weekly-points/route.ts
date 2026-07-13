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
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("points_balance, total_earned, last_weekly_claim")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const lastClaim = profile.last_weekly_claim
      ? new Date(profile.last_weekly_claim)
      : null;

    if (lastClaim) {
      const daysSince =
        (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        const daysLeft = Math.ceil(7 - daysSince);
        return NextResponse.json(
          {
            error: `You can claim again in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
          },
          { status: 400 }
        );
      }
    }

    const newBalance = profile.points_balance + 100;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        points_balance: newBalance,
        total_earned: profile.total_earned + 100,
        last_weekly_claim: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to grant points" },
        { status: 500 }
      );
    }

    await supabase.from("transactions").insert({
      user_id: userId,
      type: "weekly_grant",
      amount: 100,
      balance_after: newBalance,
      description: "Weekly allowance: +100 points",
    });

    return NextResponse.json({ success: true, newBalance });
  } catch (error) {
    console.error("Weekly points API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
