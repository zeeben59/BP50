-- ============================================================================
-- Supabase Migration: Persistent Auth Data for B50 Trade
-- Run this SQL in your Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin', 'moderator')),
  permissions JSONB DEFAULT '{}',
  two_factor JSONB DEFAULT '{"enabled": false, "secret": null}',
  status TEXT DEFAULT 'unverified' CHECK (status IN ('active', 'unverified', 'frozen', 'banned', 'under_review')),
  account_status TEXT DEFAULT 'unverified',
  freeze_until TIMESTAMPTZ,
  freeze_reason TEXT,
  login_attempts INT DEFAULT 0,
  risk_score INT DEFAULT 0,
  last_seen TIMESTAMPTZ,
  is_online BOOLEAN DEFAULT false,
  current_socket TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  demo_balance DECIMAL DEFAULT 500,
  savings_balance DECIMAL DEFAULT 0,
  available_balance DECIMAL DEFAULT 500,
  frozen_balance DECIMAL DEFAULT 0
);

-- 3. Pending OTPs table
CREATE TABLE IF NOT EXISTS pending_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_otps_email ON pending_otps(email);
CREATE INDEX IF NOT EXISTS idx_pending_otps_expires ON pending_otps(expires);

-- 5. Row Level Security (RLS) — disable for server-side access via service role key
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_otps ENABLE ROW LEVEL SECURITY;

-- Allow service role (server) full access
CREATE POLICY "Service role full access on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on wallets" ON wallets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on pending_otps" ON pending_otps
  FOR ALL USING (true) WITH CHECK (true);
