-- ============================================================================
-- Normalize membership_plans.vip_level values to match expected labels
-- - Ensures 'Intern' plan stores vip_level = 'intern'
-- - Ensures 'VIP1' plan stores vip_level = 'vip1'
-- - Guards for enum type and commit new labels before usage
-- - Safe to run multiple times
-- ============================================================================

-- 0) If enum exists, add labels and commit so they are usable immediately
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vip_level_enum') THEN
    BEGIN
      ALTER TYPE vip_level_enum ADD VALUE IF NOT EXISTS 'Intern';
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER TYPE vip_level_enum ADD VALUE IF NOT EXISTS 'VIP1';
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN ALTER TYPE vip_level_enum ADD VALUE IF NOT EXISTS 'VIP2';  EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE vip_level_enum ADD VALUE IF NOT EXISTS 'VIP3';  EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE vip_level_enum ADD VALUE IF NOT EXISTS 'VIP4';  EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE vip_level_enum ADD VALUE IF NOT EXISTS 'VIP5';  EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE vip_level_enum ADD VALUE IF NOT EXISTS 'VIP6';  EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE vip_level_enum ADD VALUE IF NOT EXISTS 'VIP7';  EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE vip_level_enum ADD VALUE IF NOT EXISTS 'VIP8';  EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE vip_level_enum ADD VALUE IF NOT EXISTS 'VIP9';  EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE vip_level_enum ADD VALUE IF NOT EXISTS 'VIP10'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

COMMIT;
BEGIN;

-- 1) Update membership_plans vip_level values with enum/text guards
DO $$
BEGIN
  -- Detect if membership_plans.vip_level uses the vip_level_enum type
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_type t ON a.atttypid = t.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'membership_plans'
      AND a.attname = 'vip_level'
      AND t.typname = 'vip_level_enum'
  ) THEN
    -- Ensure enum label exists before update
    IF EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'Intern'
    ) THEN
      UPDATE public.membership_plans
      SET vip_level = 'Intern'::vip_level_enum
      WHERE name = 'Intern' OR lower(vip_level::text) = 'intern' OR vip_level::text = 'Intern';
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'VIP1'
    ) THEN
      UPDATE public.membership_plans
      SET vip_level = 'VIP1'::vip_level_enum
      WHERE name = 'VIP1' OR lower(vip_level::text) = 'vip1' OR vip_level::text = 'VIP1';
    END IF;
  ELSE
    -- Non-enum column; normalize as text
    UPDATE public.membership_plans
    SET vip_level = 'Intern'
    WHERE name = 'Intern' OR lower(vip_level) = 'intern' OR vip_level = 'Intern';

    UPDATE public.membership_plans
    SET vip_level = 'VIP1'
    WHERE name = 'VIP1' OR lower(vip_level) = 'vip1' OR vip_level = 'VIP1';
  END IF;
END$$;

-- 1b) Extend normalization for VIP2..VIP10 (enum/text-safe)
DO $$
BEGIN
  -- Detect if membership_plans.vip_level uses the vip_level_enum type
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_type t ON a.atttypid = t.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'membership_plans'
      AND a.attname = 'vip_level'
      AND t.typname = 'vip_level_enum'
  ) THEN
    -- Enum branch: normalize to uppercase labels VIP2..VIP10
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'VIP2') THEN
      UPDATE public.membership_plans SET vip_level = 'VIP2'::vip_level_enum WHERE name = 'VIP2' OR lower(vip_level::text) = 'vip2' OR vip_level::text = 'VIP2';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'VIP3') THEN
      UPDATE public.membership_plans SET vip_level = 'VIP3'::vip_level_enum WHERE name = 'VIP3' OR lower(vip_level::text) = 'vip3' OR vip_level::text = 'VIP3';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'VIP4') THEN
      UPDATE public.membership_plans SET vip_level = 'VIP4'::vip_level_enum WHERE name = 'VIP4' OR lower(vip_level::text) = 'vip4' OR vip_level::text = 'VIP4';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'VIP5') THEN
      UPDATE public.membership_plans SET vip_level = 'VIP5'::vip_level_enum WHERE name = 'VIP5' OR lower(vip_level::text) = 'vip5' OR vip_level::text = 'VIP5';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'VIP6') THEN
      UPDATE public.membership_plans SET vip_level = 'VIP6'::vip_level_enum WHERE name = 'VIP6' OR lower(vip_level::text) = 'vip6' OR vip_level::text = 'VIP6';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'VIP7') THEN
      UPDATE public.membership_plans SET vip_level = 'VIP7'::vip_level_enum WHERE name = 'VIP7' OR lower(vip_level::text) = 'vip7' OR vip_level::text = 'VIP7';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'VIP8') THEN
      UPDATE public.membership_plans SET vip_level = 'VIP8'::vip_level_enum WHERE name = 'VIP8' OR lower(vip_level::text) = 'vip8' OR vip_level::text = 'VIP8';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'VIP9') THEN
      UPDATE public.membership_plans SET vip_level = 'VIP9'::vip_level_enum WHERE name = 'VIP9' OR lower(vip_level::text) = 'vip9' OR vip_level::text = 'VIP9';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'VIP10') THEN
      UPDATE public.membership_plans SET vip_level = 'VIP10'::vip_level_enum WHERE name = 'VIP10' OR lower(vip_level::text) = 'vip10' OR vip_level::text = 'VIP10';
    END IF;
  ELSE
    -- Text branch: normalize to uppercase labels VIP2..VIP10
    UPDATE public.membership_plans SET vip_level = 'VIP2'  WHERE name = 'VIP2'  OR lower(vip_level) = 'vip2'  OR vip_level = 'VIP2';
    UPDATE public.membership_plans SET vip_level = 'VIP3'  WHERE name = 'VIP3'  OR lower(vip_level) = 'vip3'  OR vip_level = 'VIP3';
    UPDATE public.membership_plans SET vip_level = 'VIP4'  WHERE name = 'VIP4'  OR lower(vip_level) = 'vip4'  OR vip_level = 'VIP4';
    UPDATE public.membership_plans SET vip_level = 'VIP5'  WHERE name = 'VIP5'  OR lower(vip_level) = 'vip5'  OR vip_level = 'VIP5';
    UPDATE public.membership_plans SET vip_level = 'VIP6'  WHERE name = 'VIP6'  OR lower(vip_level) = 'vip6'  OR vip_level = 'VIP6';
    UPDATE public.membership_plans SET vip_level = 'VIP7'  WHERE name = 'VIP7'  OR lower(vip_level) = 'vip7'  OR vip_level = 'VIP7';
    UPDATE public.membership_plans SET vip_level = 'VIP8'  WHERE name = 'VIP8'  OR lower(vip_level) = 'vip8'  OR vip_level = 'VIP8';
    UPDATE public.membership_plans SET vip_level = 'VIP9'  WHERE name = 'VIP9'  OR lower(vip_level) = 'vip9'  OR vip_level = 'VIP9';
    UPDATE public.membership_plans SET vip_level = 'VIP10' WHERE name = 'VIP10' OR lower(vip_level) = 'vip10' OR vip_level = 'VIP10';
  END IF;
END$$;

-- 1c) Normalize users.vip_level safely (enum/text)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_type t ON a.atttypid = t.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'users'
      AND a.attname = 'vip_level'
      AND t.typname = 'vip_level_enum'
  ) THEN
    -- Enum column: cast to text for comparison, assign uppercase enum labels
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'Intern') THEN
      UPDATE public.users SET vip_level = 'Intern'::vip_level_enum WHERE lower(vip_level::text) = 'intern' OR vip_level::text = 'Intern';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'VIP1') THEN
      UPDATE public.users SET vip_level = 'VIP1'::vip_level_enum WHERE lower(vip_level::text) = 'vip1' OR vip_level::text = 'VIP1';
    END IF;
  ELSE
    -- Text column: compare as text and set uppercase strings
    UPDATE public.users SET vip_level = 'Intern' WHERE lower(vip_level) = 'intern' OR vip_level = 'Intern';
    UPDATE public.users SET vip_level = 'VIP1'   WHERE lower(vip_level) = 'vip1'   OR vip_level = 'VIP1';
  END IF;
END$$;

-- 2) Verification helpers
SELECT 'membership_plans after normalization' AS info;
SELECT name, vip_level FROM public.membership_plans ORDER BY name;

-- ============================================================================
-- Usage:
-- - Run this file in Supabase SQL editor
-- - Then query: SELECT name, vip_level FROM public.membership_plans;
--   Expect: Intern -> intern, VIP1 -> vip1
-- ============================================================================