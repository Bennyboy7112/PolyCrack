import { getSupabase } from "@/lib/supabase";
import type { Profile } from "@/types";

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase();
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
  const supabase = getSupabase();
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

  const supabase = getSupabase();
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

export async function isAdmin(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  return profile?.is_admin === true;
}

export async function makeAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ is_admin: true })
    .eq("id", userId);
  return !error;
}

export async function getAllUsers(): Promise<Profile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }
  return data || [];
}

export async function getAllMarkets(): Promise<any[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("markets")
    .select("*, profiles!creator_id(username)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching markets:", error);
    return [];
  }
  return data || [];
}

export async function deleteMarket(marketId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase.from("markets").delete().eq("id", marketId);
  return !error;
}

export async function adjustPoints(userId: string, amount: number): Promise<boolean> {
  const supabase = getSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("points_balance")
    .eq("id", userId)
    .single();

  if (!profile) return false;

  const newBalance = profile.points_balance + amount;
  const { error } = await supabase
    .from("profiles")
    .update({ points_balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return false;

  await supabase.from("transactions").insert({
    user_id: userId,
    type: amount > 0 ? "weekly_grant" : "bet_placed",
    amount,
    balance_after: newBalance,
    description: amount > 0 ? `Admin added ${amount} points` : `Admin removed ${Math.abs(amount)} points`,
  });

  return true;
}