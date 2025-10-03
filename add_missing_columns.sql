-- ============================================
-- ADD MISSING COLUMNS TO USERS TABLE
-- Run this in Supabase SQL Editor
-- ============================================

-- Add missing profile columns that the frontend expects
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS position_title TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS work_experience TEXT,
ADD COLUMN IF NOT EXISTS education_level TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Update the trigger function to include these new columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_username TEXT;
  username_counter INTEGER := 0;
BEGIN
  -- Generate base username from email
  new_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
  
  -- Make sure username is unique
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = new_username) LOOP
    username_counter := username_counter + 1;
    new_username := LOWER(SPLIT_PART(NEW.email, '@', 1)) || username_counter::TEXT;
  END LOOP;
  
  -- Insert the user record with all columns including new ones
  INSERT INTO public.users (
    auth_user_id,
    full_name,
    username,
    phone_number,
    position_title,
    company_name,
    work_experience,
    education_level,
    bio,
    vip_level,
    trial_start_date,
    trial_end_date,
    trial_expired,
    personal_wallet_balance,
    income_wallet_balance,
    can_withdraw,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    new_username,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'position_title', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'work_experience', ''),
    COALESCE(NEW.raw_user_meta_data->>'education_level', ''),
    COALESCE(NEW.raw_user_meta_data->>'bio', ''),
    'Intern'::vip_level_enum,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '3 days',
    FALSE,
    0.00,
    0.00,
    FALSE,
    TRUE,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error for debugging
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  -- Don't fail the auth signup
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing users to have empty values for new columns (they're already NULL)
-- This is just for completeness
UPDATE public.users 
SET 
  position_title = COALESCE(position_title, ''),
  company_name = COALESCE(company_name, ''),
  work_experience = COALESCE(work_experience, ''),
  education_level = COALESCE(education_level, ''),
  bio = COALESCE(bio, '')
WHERE position_title IS NULL 
   OR company_name IS NULL 
   OR work_experience IS NULL 
   OR education_level IS NULL 
   OR bio IS NULL;

-- Verify the changes
SELECT 
  'Missing columns added successfully!' as status,
  'Updated trigger function to handle new columns' as trigger_status,
  'Existing users updated with default values' as data_status;

-- Show the new table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name IN ('position_title', 'company_name', 'work_experience', 'education_level', 'bio')
ORDER BY column_name;