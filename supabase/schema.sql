-- Poly Crack Database Schema
-- Safe to re-run (drops existing policies first)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  DROP POLICY IF EXISTS "Markets are viewable by everyone" ON markets;
  DROP POLICY IF EXISTS "Authenticated users can create markets" ON markets;
  DROP POLICY IF EXISTS "Creators can update own markets" ON markets;
  DROP POLICY IF EXISTS "Outcomes are viewable by everyone" ON outcomes;
  DROP POLICY IF EXISTS "Authenticated users can create outcomes" ON outcomes;
  DROP POLICY IF EXISTS "Bets are viewable by everyone" ON bets;
  DROP POLICY IF EXISTS "Authenticated users can create bets" ON bets;
  DROP POLICY IF EXISTS "System can update bets" ON bets;
  DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
  DROP POLICY IF EXISTS "System can create transactions" ON transactions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  points_balance NUMERIC NOT NULL DEFAULT 1000,
  total_earned NUMERIC NOT NULL DEFAULT 1000,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  markets_created INTEGER NOT NULL DEFAULT 0,
  bets_placed INTEGER NOT NULL DEFAULT 0,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  last_weekly_claim TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  question TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  market_type TEXT NOT NULL CHECK (market_type IN ('binary', 'multi')),
  end_date TIMESTAMPTZ NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  winning_outcome_id UUID,
  total_volume NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID REFERENCES markets(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0 AND price <= 1),
  is_yes BOOLEAN,
  total_bets INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  outcome_id UUID REFERENCES outcomes(id) NOT NULL,
  market_id UUID REFERENCES markets(id) NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  price NUMERIC NOT NULL,
  shares NUMERIC NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  won BOOLEAN,
  payout NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weekly_grant', 'bet_placed', 'bet_won', 'bet_refund', 'market_created', 'signup_bonus')),
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  market_id UUID REFERENCES markets(id),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcomes_market_id ON outcomes(market_id);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_market_id ON bets(market_id);
CREATE INDEX IF NOT EXISTS idx_bets_outcome_id ON bets(outcome_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Enable RLS (safe to re-run)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Markets are viewable by everyone" ON markets FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create markets" ON markets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Creators can update own markets" ON markets FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Outcomes are viewable by everyone" ON outcomes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create outcomes" ON outcomes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Bets are viewable by everyone" ON bets FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create bets" ON bets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can update bets" ON bets FOR UPDATE USING (true);

CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create transactions" ON transactions FOR INSERT WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Admin policy: admins can do everything
CREATE POLICY "Admins have full access" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can manage all markets" ON markets FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can manage all outcomes" ON outcomes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can manage all bets" ON bets FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
