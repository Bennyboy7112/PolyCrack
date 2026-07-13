import { supabase } from "./supabase";
import type { Profile } from "@/types";

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    return null;
  }
  return data;
}

export async function checkWeeklyAllowance(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  if (!profile) return false;

  const now = new Date();
  const lastClaim = profile.last_weekly_claim
    ? new Date(profile.last_weekly_claim)
    : null;

  if (!lastClaim) {
    return true;
  }

  const daysSinceLastClaim =
    (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLastClaim >= 7;
}

export async function grantWeeklyPoints(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  if (!profile) return false;

  const canClaim = await checkWeeklyAllowance(userId);
  if (!canClaim) return false;

  const newBalance = profile.points_balance + 100;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      points_balance: newBalance,
      total_earned: profile.total_earned + 100,
      last_weekly_claim: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Error granting weekly points:", updateError);
    return false;
  }

  await supabase.from("transactions").insert({
    user_id: userId,
    type: "weekly_grant",
    amount: 100,
    balance_after: newBalance,
    description: "Weekly allowance: 100 points",
  });

  return true;
}
