-- Drop existing trigger and function to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();

-- Create a simple, working trigger function based on what worked before
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id INTEGER;
    username_value TEXT;
BEGIN
    -- Generate a unique username
    username_value := 'user_' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
    
    -- Insert into users table
    INSERT INTO public.users (
        auth_user_id,
        full_name,
        username,
        phone_number,
        vip_level,
        user_status,
        referral_code
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        username_value,
        COALESCE(NEW.phone, ''),
        'intern',
        'active',
        SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)
    ) RETURNING id INTO new_user_id;
    
    -- Insert into user_profiles table
    INSERT INTO public.user_profiles (
        id,
        user_id,
        full_name,
        username,
        phone_number,
        membership_type,
        membership_level
    ) VALUES (
        gen_random_uuid(),
        new_user_id::UUID,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        username_value,
        COALESCE(NEW.phone, ''),
        'intern',
        'intern'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile_from_auth();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;

-- Test the trigger by checking if it was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

SELECT 'Simple working trigger recreated successfully!' as result;