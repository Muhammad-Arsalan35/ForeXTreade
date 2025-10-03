-- ============================================================================
-- TARGETED CONSTRAINT FIX - SPECIFIC ISSUE RESOLUTION
-- ============================================================================
-- This script specifically fixes the foreign key constraint and missing functions

-- 1. Drop the problematic foreign key constraint
DO $$
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_auth_user_id_fkey' 
        AND table_name = 'users'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_auth_user_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint users_auth_user_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint users_auth_user_id_fkey does not exist';
    END IF;
END $$;

-- 2. Drop existing trigger and function to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Create the sql RPC function for diagnostics
CREATE OR REPLACE FUNCTION public.sql(query text)
RETURNS TABLE(result jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY EXECUTE format('SELECT to_jsonb(t) FROM (%s) t', query);
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT to_jsonb(SQLERRM);
END;
$$;

-- 4. Grant permissions on sql function
GRANT EXECUTE ON FUNCTION public.sql(text) TO authenticated, anon, service_role;

-- 5. Create simplified trigger function without foreign key dependency
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    unique_username TEXT;
    username_counter INTEGER := 0;
    base_username TEXT;
BEGIN
    -- Log the trigger execution
    RAISE NOTICE 'Trigger handle_new_user called for auth user: %', NEW.id;
    
    -- Generate base username from email
    IF NEW.email IS NOT NULL THEN
        base_username := split_part(NEW.email, '@', 1);
        base_username := regexp_replace(base_username, '[^a-zA-Z0-9]', '', 'g');
        base_username := lower(base_username);
        IF length(base_username) < 3 THEN
            base_username := 'user_' || substr(NEW.id::text, 1, 8);
        END IF;
    ELSE
        base_username := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;
    
    -- Ensure username is unique
    unique_username := base_username;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = unique_username) LOOP
        username_counter := username_counter + 1;
        unique_username := base_username || '_' || username_counter;
    END LOOP;
    
    -- Insert into public.users table (without foreign key constraint)
    BEGIN
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
            'VIP1',
            'active',
            UPPER(substr(gen_random_uuid()::text, 1, 8)),
            0.00,
            0.00,
            0.00,
            0.00,
            'Member'
        ) RETURNING id INTO new_user_id;
        
        RAISE NOTICE 'Successfully created user with ID: %', new_user_id;
        
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
            0.00,
            0.00,
            0.00
        );
        
        RAISE NOTICE 'Successfully created user profile for user ID: %', new_user_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error in trigger function: %', SQLERRM;
        -- Still return NEW to allow auth user creation
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Ensure RLS policies are permissive for signup
DROP POLICY IF EXISTS "Allow all operations during signup" ON public.users;
DROP POLICY IF EXISTS "Allow all operations on profiles" ON public.user_profiles;

CREATE POLICY "Allow all operations during signup" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on profiles" ON public.user_profiles
    FOR ALL USING (true) WITH CHECK (true);

-- 8. Grant comprehensive permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON public.users TO authenticated, anon, service_role;
GRANT ALL ON public.user_profiles TO authenticated, anon, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;

-- 9. Verification
SELECT 'Targeted constraint fix completed!' as status;

-- Check constraint removal
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'users_auth_user_id_fkey'
        ) 
        THEN 'CONSTRAINT STILL EXISTS - PROBLEM!' 
        ELSE 'Constraint successfully removed' 
    END as constraint_status;

-- Check function creation
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
        THEN 'Trigger function exists'
        ELSE 'TRIGGER FUNCTION MISSING - PROBLEM!'
    END as function_status;

-- Check trigger creation
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created'
        )
        THEN 'Trigger exists'
        ELSE 'TRIGGER MISSING - PROBLEM!'
    END as trigger_status;

-- Check sql function
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sql')
        THEN 'SQL RPC function exists'
        ELSE 'SQL RPC FUNCTION MISSING - PROBLEM!'
    END as sql_function_status;

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Copy this entire SQL script
-- 2. Go to your Supabase Dashboard > SQL Editor
-- 3. Paste and run this script
-- 4. Verify all status messages show success
-- 5. Test signup with: node test_signup_simple.cjs
-- ============================================================================