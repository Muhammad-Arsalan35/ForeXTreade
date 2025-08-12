-- Fix phone authentication to work without confirmation
-- Update auth configuration to disable phone confirmation

-- First, let's update the existing user to be confirmed since they signed up successfully
UPDATE auth.users 
SET phone_confirmed_at = now(), 
    email_confirmed_at = now(),
    confirmed_at = now()
WHERE phone = '923003535318';

-- Also ensure any future phone signups are automatically confirmed
-- This requires updating the auth.users table triggers if they exist
CREATE OR REPLACE FUNCTION public.auto_confirm_phone_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Auto-confirm phone users upon signup
  IF NEW.phone IS NOT NULL AND NEW.phone_confirmed_at IS NULL THEN
    NEW.phone_confirmed_at = now();
    NEW.confirmed_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-confirm phone users
DROP TRIGGER IF EXISTS auto_confirm_phone_on_signup ON auth.users;
CREATE TRIGGER auto_confirm_phone_on_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW 
  WHEN (NEW.phone IS NOT NULL)
  EXECUTE FUNCTION public.auto_confirm_phone_user();