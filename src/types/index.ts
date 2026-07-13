export interface Profile {
  id: string;
  email: string;
  username: string;
  points_balance: number;
  total_earned: number;
  total_spent: number;
  markets_created: number;
  bets_placed: number;
  last_weekly_claim: string | null;
  created_at: string;
  updated_at: string;
}

export interface Market {
  id: string;
  creator_id: string;
  question: string;
  description: string;
  category: string;
  market_type: "binary" | "multi";
  end_date: string;
  resolved: boolean;
  winning_outcome_id: string | null;
  total_volume: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Outcome {
  id: string;
  market_id: string;
  label: string;
  price: number;
  is_yes?: boolean;
  total_bets: number;
  total_amount: number;
  created_at: string;
}

export interface Bet {
  id: string;
  user_id: string;
  outcome_id: string;
  market_id: string;
  amount: number;
  price: number;
  shares: number;
  resolved: boolean;
  won: boolean | null;
  payout: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: "weekly_grant" | "bet_placed" | "bet_won" | "bet_refund" | "market_created" | "signup_bonus";
  amount: number;
  balance_after: number;
  market_id: string | null;
  description: string;
  created_at: string;
}

export interface MarketWithOutcomes extends Market {
  outcomes: Outcome[];
  creator?: Profile;
  user_bet?: Bet[];
}

export interface LeaderboardEntry {
  profile: Profile;
  profit: number;
  win_rate: number;
}
