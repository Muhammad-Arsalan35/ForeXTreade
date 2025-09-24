-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();

-- Create a bulletproof trigger function
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id INTEGER;
    username_value TEXT;
BEGIN
    -- Generate a unique username
    username_value := 'user_' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
    
    -- Insert into users table with error handling
    BEGIN
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
        
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Failed to create user record: %', SQLERRM;
        RETURN NEW;
    END;
    
    -- Insert into user_profiles table with error handling
    BEGIN
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
        
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    END;
    
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

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
CREATE POLICY "Users can view own record" ON public.users
    FOR SELECT USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record" ON public.users
    FOR UPDATE USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = user_profiles.user_id 
            AND users.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = user_profiles.user_id 
            AND users.auth_user_id = auth.uid()
        )
    );

SELECT 'Bulletproof trigger created successfully!' as result;