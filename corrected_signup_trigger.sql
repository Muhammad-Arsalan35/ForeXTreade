-- ============================================================================
-- CORRECTED SIGNUP TRIGGER - ALIGNS FRONTEND WITH DATABASE SCHEMA
-- ============================================================================
-- This trigger ensures consistency between users and user_profiles tables
-- and properly handles the intern membership system

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();

-- Create corrected trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    unique_username TEXT;
    username_counter INTEGER := 0;
    base_username TEXT;
    referral_code_value TEXT;
    referrer_user_id UUID;
    referrer_level CHAR(1);
    new_referral_level CHAR(1);
    b_level_referral_count INTEGER := 0;
BEGIN
    -- Generate base username from metadata or email
    IF NEW.raw_user_meta_data->>'username' IS NOT NULL THEN
        base_username := NEW.raw_user_meta_data->>'username';
    ELSIF NEW.email IS NOT NULL THEN
        base_username := split_part(NEW.email, '@', 1);
        base_username := regexp_replace(base_username, '[^a-zA-Z0-9]', '', 'g');
        base_username := lower(base_username);
    ELSE
        base_username := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;
    
    -- Ensure username is unique
    unique_username := base_username;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = unique_username) LOOP
        username_counter := username_counter + 1;
        unique_username := base_username || '_' || username_counter;
    END LOOP;
    
    -- Generate referral code
    referral_code_value := UPPER(substr(gen_random_uuid()::text, 1, 8));
    
    -- Check if referred by someone
    IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
        SELECT id INTO referrer_user_id 
        FROM public.users 
        WHERE referral_code = NEW.raw_user_meta_data->>'referral_code'
        LIMIT 1;
    END IF;

    -- Determine referrer_level from user_profiles if available; default to 'A'
    IF referrer_user_id IS NOT NULL THEN
        SELECT COALESCE(up.referral_level, 'A')
        INTO referrer_level
        FROM public.user_profiles up
        WHERE up.user_id = referrer_user_id;
    ELSE
        referrer_level := 'A';
    END IF;

    -- Compute new user's referral level based on business rules
    -- No referrer => 'A'; Referrer 'A' => 'B'; Referrer 'B' => 'C'; Referrer 'C' => cannot refer
    IF referrer_user_id IS NULL THEN
        new_referral_level := 'A';
    ELSIF referrer_level = 'A' THEN
        new_referral_level := 'B';
    ELSIF referrer_level = 'B' THEN
        new_referral_level := 'C';
    ELSE
        -- Referrer is 'C' => disallow referral (user becomes 'A' with no referrer)
        referrer_user_id := NULL;
        new_referral_level := 'A';
    END IF;

    -- Enforce B-level referral cap: max 10 C-level referrals
    IF referrer_user_id IS NOT NULL AND referrer_level = 'B' THEN
        SELECT COUNT(*)
        INTO b_level_referral_count
        FROM public.users u
        JOIN public.user_profiles up ON up.user_id = u.id
        WHERE u.referred_by = referrer_user_id AND up.referral_level = 'C';

        IF b_level_referral_count >= 10 THEN
            -- Disallow further referrals from B-level beyond the cap
            referrer_user_id := NULL;
            new_referral_level := 'A';
        END IF;
    END IF;
    
    -- Insert into public.users table (INTERN LEVEL - consistent with user_profiles)
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
        position_title,
        referred_by
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        unique_username,
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
        'Intern', -- Changed from VIP1 to Intern for consistency
        'active',
        referral_code_value,
        0.00,
        0.00,
        0.00,
        0.00,
        'Member',
        referrer_user_id
    ) RETURNING id INTO new_user_id;
    
    -- Insert into public.user_profiles table (CONSISTENT WITH USERS TABLE)
    INSERT INTO public.user_profiles (
        user_id,
        full_name,
        username,
        phone_number,
        membership_type,
        membership_level,
        referral_level,
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
        'intern', -- Consistent with users.vip_level = 'Intern'
        'Intern',
        new_referral_level,
        true,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '3 days', -- 3-day trial period
        0,
        CURRENT_DATE,
        0.00,
        0.00,
        0.00
    );
    
    -- Handle referral relationship if applicable
    IF referrer_user_id IS NOT NULL THEN
        -- Add to referrals table
        INSERT INTO public.referrals (
            referrer_id,
            referred_id,
            level,
            commission_rate,
            referral_code_used,
            registration_completed,
            status
        ) VALUES (
            referrer_user_id,
            new_user_id,
            'A', -- Direct referral
            0.1, -- 10% commission rate
            NEW.raw_user_meta_data->>'referral_code',
            true,
            'active'
        );
        
        -- Add to team structure
        INSERT INTO public.team_structure (
            user_id,
            parent_id
        ) VALUES (
            new_user_id,
            referrer_user_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON public.users TO authenticated;
GRANT INSERT ON public.user_profiles TO authenticated;
GRANT INSERT ON public.referrals TO authenticated;
GRANT INSERT ON public.team_structure TO authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT UPDATE ON public.user_profiles TO authenticated;

-- Enable RLS policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.user_profiles FOR SELECT 
  USING (auth.uid() IN (
    SELECT auth_user_id FROM public.users WHERE id = user_id
  ));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.user_profiles FOR UPDATE 
  USING (auth.uid() IN (
    SELECT auth_user_id FROM public.users WHERE id = user_id
  ));

DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;
CREATE POLICY "Allow profile creation during signup" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for users table
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data" 
  ON public.users FOR SELECT 
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can update their own data" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
CREATE POLICY "Allow user creation during signup" ON public.users
    FOR INSERT WITH CHECK (true);

-- Allow users to view other users for referrals
DROP POLICY IF EXISTS "Users can view others for referrals" ON public.users;
CREATE POLICY "Users can view others for referrals" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

SELECT 'Corrected signup trigger installed successfully!' as status;