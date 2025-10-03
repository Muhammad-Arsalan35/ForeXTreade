-- ============================================================================
-- CREATE USER_PROFILES TABLE AND SIGNUP TRIGGER
-- ============================================================================
-- This creates the missing user_profiles table and sets up the signup trigger

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name VARCHAR(100),
  username VARCHAR(50),
  phone_number VARCHAR(30),
  
  -- Membership fields
  membership_type VARCHAR(20) DEFAULT 'intern' CHECK (membership_type IN ('free', 'intern', 'vip')),
  membership_level VARCHAR(10) DEFAULT 'Intern',
  
  -- Trial status
  is_trial_active BOOLEAN DEFAULT true,
  trial_start_date DATE DEFAULT CURRENT_DATE,
  trial_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '3 days'),
  
  -- Video tracking
  videos_watched_today INTEGER DEFAULT 0,
  last_video_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Financial tracking
  total_earnings NUMERIC(12,2) DEFAULT 0,
  income_wallet_balance NUMERIC(12,2) DEFAULT 0,
  personal_wallet_balance NUMERIC(12,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_membership_type ON public.user_profiles(membership_type);

-- 3. Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = user_id));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = user_id));

DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;
CREATE POLICY "Allow profile creation during signup" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

-- 5. Create or replace the signup trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    unique_username TEXT;
    username_counter INTEGER := 0;
    base_username TEXT;
    referrer_user_id UUID;
BEGIN
    -- Generate unique username
    base_username := 'user_' || substr(NEW.id::text, 1, 8);
    unique_username := base_username;
    
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = unique_username) OR 
          EXISTS (SELECT 1 FROM public.user_profiles WHERE username = unique_username) LOOP
        username_counter := username_counter + 1;
        unique_username := base_username || '_' || username_counter;
    END LOOP;
    
    -- Insert into public.users table
    INSERT INTO public.users (
        auth_user_id,
        full_name,
        username,
        phone_number,
        vip_level,
        user_status,
        referral_code,
        personal_wallet_balance,
        income_wallet_balance,
        total_earnings,
        total_invested,
        position_title
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        unique_username,
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
        'Intern',
        'active',
        UPPER(substr(gen_random_uuid()::text, 1, 8)),
        0.00,
        0.00,
        0.00,
        0.00,
        'Member'
    ) RETURNING id INTO new_user_id;
    
    -- Insert into public.user_profiles table
    INSERT INTO public.user_profiles (
        user_id,
        full_name,
        username,
        phone_number,
        membership_type,
        membership_level,
        is_trial_active,
        trial_start_date,
        trial_end_date,
        videos_watched_today,
        last_video_reset_date,
        total_earnings,
        income_wallet_balance,
        personal_wallet_balance
    ) VALUES (
        new_user_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        unique_username,
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
        'intern',
        'Intern',
        true,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '3 days',
        0,
        CURRENT_DATE,
        0,
        0,
        0
    );
    
    -- Handle referral if provided
    IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
        SELECT id INTO referrer_user_id 
        FROM public.users 
        WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';
        
        IF referrer_user_id IS NOT NULL THEN
            UPDATE public.users 
            SET referred_by = referrer_user_id 
            WHERE id = new_user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;

-- 8. Create user profiles for existing users who don't have them
DO $$
DECLARE
    user_record RECORD;
    unique_username TEXT;
    username_counter INTEGER;
    base_username TEXT;
BEGIN
    FOR user_record IN 
        SELECT u.id, u.auth_user_id, u.full_name, u.username, u.phone_number
        FROM public.users u
        LEFT JOIN public.user_profiles up ON u.id = up.user_id
        WHERE up.id IS NULL
    LOOP
        -- Use existing username or generate new one
        unique_username := user_record.username;
        IF unique_username IS NULL OR unique_username = '' THEN
            base_username := 'user_' || substr(user_record.auth_user_id::text, 1, 8);
            unique_username := base_username;
            username_counter := 0;
            
            WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE username = unique_username) LOOP
                username_counter := username_counter + 1;
                unique_username := base_username || '_' || username_counter;
            END LOOP;
        END IF;
        
        -- Create user profile
        INSERT INTO public.user_profiles (
            user_id,
            full_name,
            username,
            phone_number,
            membership_type,
            membership_level,
            is_trial_active,
            trial_start_date,
            trial_end_date,
            videos_watched_today,
            last_video_reset_date,
            total_earnings,
            income_wallet_balance,
            personal_wallet_balance
        ) VALUES (
            user_record.id,
            COALESCE(user_record.full_name, 'User'),
            unique_username,
            COALESCE(user_record.phone_number, ''),
            'intern',
            'Intern',
            true,
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '3 days',
            0,
            CURRENT_DATE,
            0,
            0,
            0
        );
    END LOOP;
END $$;

SELECT 'User profiles table and trigger setup completed successfully!' as status;