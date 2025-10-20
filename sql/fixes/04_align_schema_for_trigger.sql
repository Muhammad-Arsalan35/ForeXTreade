-- ==========================================================================
-- Align schema with trigger expectations (safe to re-run)
-- Adds missing columns used by the auth->users+profiles trigger
-- Run in Supabase SQL Editor after 00 and before/after 02
-- ==========================================================================

-- Users table columns
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS vip_level TEXT DEFAULT 'intern',
  ADD COLUMN IF NOT EXISTS personal_wallet_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_wallet_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earnings NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_invested NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS position_title TEXT DEFAULT 'Member';

-- User profiles columns
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'intern',
  ADD COLUMN IF NOT EXISTS membership_level TEXT DEFAULT 'Intern',
  ADD COLUMN IF NOT EXISTS is_trial_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS trial_start_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS trial_end_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS videos_watched_today INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_video_reset_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS total_earnings NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_wallet_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personal_wallet_balance NUMERIC DEFAULT 0;