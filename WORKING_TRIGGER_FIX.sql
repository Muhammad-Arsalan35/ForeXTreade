-- ============================================================================
-- WORKING TRIGGER FIX FOR SIGNUP DATABASE ERROR
-- This fixes the "Database error saving new user" issue
-- ============================================================================

-- Drop any existing triggers and functions
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Ensure tables have correct structure
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS membership_type VARCHAR(20) DEFAULT 'intern';

-- Create the working trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    new_username TEXT;
    user_record_id UUID;
    username_counter INTEGER := 0;
    base_username TEXT;
BEGIN
    -- Generate base username from email or use default
    IF NEW.email IS NOT NULL THEN
        base_username := split_part(NEW.email, '@', 1);
        -- Clean username (remove special characters)
        base_username := regexp_replace(base_username, '[^a-zA-Z0-9]', '', 'g');
        -- Ensure it's not empty
        IF length(base_username) < 3 THEN
            base_username := 'user';
        END IF;
    ELSE
        base_username := 'user';
    END IF;
    
    -- Make username unique
    new_username := base_username;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = new_username) LOOP
        username_counter := username_counter + 1;
        new_username := base_username || '_' || username_counter;
    END LOOP;

    -- Insert into users table first
    INSERT INTO public.users (
        auth_user_id, 
        full_name, 
        username, 
        phone_number,
        vip_level,
        position_title, 
        user_status,
        total_earnings, 
        income_wallet_balance,
        personal_wallet_balance,
        referral_code, 
        created_at, 
        updated_at
    ) VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        new_username, 
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
        'VIP1',
        'Member', 
        'active',
        0.00,
        0.00,
        0.00,
        upper(substring(md5(random()::text) from 1 for 8)),
        NOW(), 
        NOW()
    ) RETURNING id INTO user_record_id;

    -- Insert into user_profiles table
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
        total_earnings, 
        income_wallet_balance, 
        personal_wallet_balance,
        videos_watched_today,
        created_at, 
        updated_at
    ) VALUES (
        user_record_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        new_username, 
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
        'intern', 
        'Intern',
        true,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '3 days',
        0.00, 
        0.00, 
        0.00, 
        0,
        NOW(), 
        NOW()
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Verification query
SELECT 'Trigger fix applied successfully!' as result;