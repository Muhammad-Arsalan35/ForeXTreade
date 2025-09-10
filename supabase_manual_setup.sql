-- Complete Database Fix Script for ForeXTreade Application
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/npliuqbormakkyggcgtw/sql
-- This script fixes all missing tables, functions, and data structure issues

-- ============================================================================
-- 1. CREATE MISSING ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vip_level_enum') THEN
        CREATE TYPE vip_level_enum AS ENUM ('VIP1', 'VIP2', 'VIP3', 'VIP4', 'VIP5', 'VIP6', 'VIP7', 'VIP8', 'VIP9', 'VIP10');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum') THEN
        CREATE TYPE transaction_type_enum AS ENUM ('deposit', 'withdrawal', 'commission', 'video_earning', 'plan_purchase');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status_enum') THEN
        CREATE TYPE transaction_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_type_enum') THEN
        CREATE TYPE wallet_type_enum AS ENUM ('income_wallet', 'personal_wallet');
    END IF;
END $$;

-- ============================================================================
-- 2. CREATE MISSING MEMBERSHIP_PLANS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.membership_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar(50) UNIQUE NOT NULL,
    daily_video_limit integer NOT NULL,
    price numeric(12,2) NOT NULL,
    video_rate numeric(10,2) NOT NULL,
    duration_days integer NOT NULL DEFAULT 120,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Insert VIP plans data
INSERT INTO public.membership_plans (name, daily_video_limit, price, video_rate, duration_days, is_active) VALUES 
('VIP1', 5, 5000, 30, 120, true),
('VIP2', 10, 16000, 50, 120, true),
('VIP3', 16, 36000, 70, 120, true),
('VIP4', 31, 78000, 80, 120, true),
('VIP5', 50, 160000, 100, 120, true),
('VIP6', 75, 260000, 115, 120, true),
('VIP7', 100, 500000, 160, 120, true),
('VIP8', 120, 800000, 220, 120, true),
('VIP9', 150, 1200000, 260, 120, true),
('VIP10', 180, 2400000, 440, 120, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. CREATE MISSING TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount numeric(12,2) NOT NULL,
    transaction_type transaction_type_enum NOT NULL,
    wallet_type wallet_type_enum NOT NULL,
    reference_id uuid,
    description text,
    status transaction_status_enum DEFAULT 'completed',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================================================
-- 4. FIX COMMISSION_RATES TABLE STRUCTURE
-- ============================================================================

-- Drop existing commission_rates if it exists with wrong structure
DROP TABLE IF EXISTS public.commission_rates CASCADE;

-- Create commission_rates table with correct structure
CREATE TABLE public.commission_rates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    level varchar(1) NOT NULL CHECK (level IN ('A', 'B', 'C', 'D')),
    vip_upgrade_commission_percentage numeric(5,2) NOT NULL,
    video_commission_percentage numeric(5,2) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(level)
);

-- Insert commission rates data
INSERT INTO public.commission_rates (level, vip_upgrade_commission_percentage, video_commission_percentage, is_active) VALUES
('A', 10.00, 3.00, true),
('B', 5.00, 1.50, true),
('C', 2.00, 0.75, true),
('D', 1.00, 0.25, true);

-- ============================================================================
-- 5. FIX REFERRAL_COMMISSIONS TABLE STRUCTURE
-- ============================================================================

-- Drop existing referral_commissions if it exists with wrong structure
DROP TABLE IF EXISTS public.referral_commissions CASCADE;

-- Create referral_commissions table with correct structure (including level column)
CREATE TABLE public.referral_commissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    from_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    level varchar(1) NOT NULL CHECK (level IN ('A', 'B', 'C', 'D')),
    amount numeric(12,2) NOT NULL,
    commission_type varchar(20) NOT NULL CHECK (commission_type IN ('vip_upgrade', 'video_watching')),
    source_transaction uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone
);

-- ============================================================================
-- 6. CREATE MISSING GET_USER_VIDEO_LIMIT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_video_limit(user_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_vip_level text;
    video_limit integer;
BEGIN
    -- Get user's VIP level
    SELECT vip_level INTO user_vip_level
    FROM public.users
    WHERE id = user_uuid;
    
    -- If user not found, return 0
    IF user_vip_level IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Get video limit from membership plans
    SELECT daily_video_limit INTO video_limit
    FROM public.membership_plans
    WHERE name = user_vip_level AND is_active = true;
    
    -- Return the limit, default to 5 if not found
    RETURN COALESCE(video_limit, 5);
END;
$$;

-- ============================================================================
-- 7. CREATE HELPER FUNCTION FOR COMMISSION RATES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_commission_rate_by_level(referral_level varchar(1))
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rate_data json;
BEGIN
    SELECT json_build_object(
        'level', level,
        'vip_upgrade_commission_percentage', vip_upgrade_commission_percentage,
        'video_commission_percentage', video_commission_percentage
    ) INTO rate_data
    FROM public.commission_rates
    WHERE level = referral_level AND is_active = true;
    
    RETURN rate_data;
END;
$$;

-- ============================================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_membership_plans_name ON public.membership_plans(name);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_user_id ON public.referral_commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_level ON public.referral_commissions(level);
CREATE INDEX IF NOT EXISTS idx_commission_rates_level ON public.commission_rates(level);

-- ============================================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. CREATE RLS POLICIES
-- ============================================================================

-- Membership plans policies
DROP POLICY IF EXISTS "Anyone can view membership plans" ON public.membership_plans;
CREATE POLICY "Anyone can view membership plans" ON public.membership_plans
    FOR SELECT USING (true);

-- Transactions policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Users can insert their own transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Commission rates policies
DROP POLICY IF EXISTS "Anyone can view commission rates" ON public.commission_rates;
CREATE POLICY "Anyone can view commission rates" ON public.commission_rates
    FOR SELECT USING (true);

-- Referral commissions policies
DROP POLICY IF EXISTS "Users can view their own commissions" ON public.referral_commissions;
CREATE POLICY "Users can view their own commissions" ON public.referral_commissions
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can insert commissions" ON public.referral_commissions;
CREATE POLICY "Users can insert commissions" ON public.referral_commissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 11. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.membership_plans TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT SELECT ON public.commission_rates TO authenticated;
GRANT ALL ON public.referral_commissions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_video_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_commission_rate_by_level(varchar) TO authenticated;

SELECT 'Database setup completed successfully! All missing tables, functions, and policies have been created.' as result;