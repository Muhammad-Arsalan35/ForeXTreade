-- Add referral_level to user_profiles to align with business flow (A/B/C)
-- Safely adds a constrained column with default 'A' and updates existing rows

BEGIN;

-- Add column if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'referral_level'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN referral_level VARCHAR(1) DEFAULT 'A'
      CHECK (referral_level IN ('A','B','C'));
  END IF;
END $$;

-- Normalize any NULLs to default 'A'
UPDATE public.user_profiles
SET referral_level = COALESCE(referral_level, 'A')
WHERE referral_level IS NULL;

COMMIT;