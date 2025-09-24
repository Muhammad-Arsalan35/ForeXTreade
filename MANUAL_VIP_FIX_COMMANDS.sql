-- ============================================================================
-- MANUAL VIP AND TRIAL MEMBERSHIP FIX COMMANDS
-- ============================================================================
-- Copy and paste these commands into your Supabase SQL Editor
-- Run them one by one to fix the VIP level and trial membership issues
-- ============================================================================

-- STEP 1: Add vip_level column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS vip_level public.vip_level DEFAULT 'trial';

-- STEP 2: Add vip_level column to membership_plans table  
ALTER TABLE public.membership_plans 
ADD COLUMN IF NOT EXISTS vip_level public.vip_level;

-- STEP 3: Update existing membership plans with correct vip_level values
UPDATE public.membership_plans SET vip_level = 'trial' WHERE name = 'Intern';
UPDATE public.membership_plans SET vip_level = 'vip1' WHERE name = 'VIP1';
UPDATE public.membership_plans SET vip_level = 'vip3' WHERE name = 'VIP3';
UPDATE public.membership_plans SET vip_level = 'vip4' WHERE name = 'VIP4';
UPDATE public.membership_plans SET vip_level = 'vip5' WHERE name = 'VIP5';
UPDATE public.membership_plans SET vip_level = 'vip6' WHERE name = 'VIP6';
UPDATE public.membership_plans SET vip_level = 'vip7' WHERE name = 'VIP7';
UPDATE public.membership_plans SET vip_level = 'vip8' WHERE name = 'VIP8';
UPDATE public.membership_plans SET vip_level = 'vip9' WHERE name = 'VIP9';
UPDATE public.membership_plans SET vip_level = 'vip10' WHERE name = 'VIP10';

-- STEP 4: Insert a proper trial membership plan
INSERT INTO public.membership_plans (id, name, vip_level, price, duration_days, features, is_active)
SELECT 
    gen_random_uuid(),
    'Trial',
    'trial',
    0.00,
    7,
    '["Basic access", "Limited features", "7-day trial"]'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.membership_plans 
    WHERE name = 'Trial' OR vip_level = 'trial'
);

-- STEP 5: Update existing user profiles to have trial vip_level
UPDATE public.user_profiles 
SET vip_level = 'trial' 
WHERE vip_level IS NULL;

-- STEP 6: Create improved trigger function
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    new_username TEXT;
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 10;
    trial_plan_id UUID;
BEGIN
    -- Get the trial membership plan ID
    SELECT id INTO trial_plan_id 
    FROM public.membership_plans 
    WHERE vip_level = 'trial' 
    LIMIT 1;
    
    -- If no trial plan exists, use the first available plan
    IF trial_plan_id IS NULL THEN
        SELECT id INTO trial_plan_id 
        FROM public.membership_plans 
        WHERE is_active = true 
        ORDER BY price ASC 
        LIMIT 1;
    END IF;

    -- Generate unique username with retry logic
    LOOP
        attempt_count := attempt_count + 1;
        
        -- Generate username
        new_username := 'user_' || 
                       EXTRACT(epoch FROM NOW())::bigint || '_' || 
                       (RANDOM() * 100000000)::bigint || '_' || 
                       (RANDOM() * 100000)::bigint;
        
        -- Try to insert user record
        BEGIN
            INSERT INTO public.users (
                id, 
                auth_id, 
                email, 
                username, 
                created_at, 
                updated_at
            ) VALUES (
                gen_random_uuid(),
                NEW.id,
                NEW.email,
                new_username,
                NOW(),
                NOW()
            );
            
            -- If successful, exit the loop
            EXIT;
            
        EXCEPTION 
            WHEN unique_violation THEN
                -- If username collision, try again
                IF attempt_count >= max_attempts THEN
                    RAISE EXCEPTION 'Failed to generate unique username after % attempts', max_attempts;
                END IF;
                -- Continue loop for retry
        END;
    END LOOP;

    -- Create user profile with trial membership
    INSERT INTO public.user_profiles (
        id,
        user_id,
        username,
        vip_level,
        membership_type,
        membership_plan_id,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        (SELECT id FROM public.users WHERE auth_id = NEW.id),
        new_username,
        'trial',
        'trial',
        trial_plan_id,
        NOW(),
        NOW()
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE LOG 'Error in create_user_profile_from_auth: %', SQLERRM;
        RAISE;
END;
$$;

-- STEP 7: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile_from_auth();

-- STEP 8: Grant permissions
GRANT EXECUTE ON FUNCTION public.create_user_profile_from_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_from_auth() TO anon;

-- VERIFICATION QUERIES (run these to check if everything worked)
-- Check membership plans:
SELECT name, vip_level, price FROM public.membership_plans ORDER BY name;

-- Check recent user profiles:
SELECT username, vip_level, membership_type FROM public.user_profiles 
ORDER BY created_at DESC LIMIT 5;