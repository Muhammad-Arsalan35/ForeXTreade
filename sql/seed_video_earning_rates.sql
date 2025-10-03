-- Seed video earning rates (idempotent)
-- Ensures enum values exist (if enum is used) and unique constraint on vip_level
-- Safe to run multiple times; uses ON CONFLICT upsert

-- 1) If table uses public.vip_level_enum, ensure values exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'vip_level_enum' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'ALTER TYPE public.vip_level_enum ADD VALUE IF NOT EXISTS ''VIP1''';
    EXECUTE 'ALTER TYPE public.vip_level_enum ADD VALUE IF NOT EXISTS ''VIP2''';
    EXECUTE 'ALTER TYPE public.vip_level_enum ADD VALUE IF NOT EXISTS ''VIP3''';
    EXECUTE 'ALTER TYPE public.vip_level_enum ADD VALUE IF NOT EXISTS ''VIP4''';
    EXECUTE 'ALTER TYPE public.vip_level_enum ADD VALUE IF NOT EXISTS ''VIP5''';
    EXECUTE 'ALTER TYPE public.vip_level_enum ADD VALUE IF NOT EXISTS ''VIP6''';
    EXECUTE 'ALTER TYPE public.vip_level_enum ADD VALUE IF NOT EXISTS ''VIP7''';
    EXECUTE 'ALTER TYPE public.vip_level_enum ADD VALUE IF NOT EXISTS ''VIP8''';
    EXECUTE 'ALTER TYPE public.vip_level_enum ADD VALUE IF NOT EXISTS ''VIP9''';
    EXECUTE 'ALTER TYPE public.vip_level_enum ADD VALUE IF NOT EXISTS ''VIP10''';
  END IF;
END $$;

-- 2) Ensure unique constraint on vip_level for upsert safety
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'video_earning_rates'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'video_earning_rates_vip_level_key'
  ) THEN
    ALTER TABLE public.video_earning_rates
    ADD CONSTRAINT video_earning_rates_vip_level_key UNIQUE (vip_level);
  END IF;
END $$;

-- 3) Upsert seed data (aligned with existing UI/migrations)
INSERT INTO public.video_earning_rates (vip_level, rate_per_video) VALUES
  ('VIP1', 30),
  ('VIP2', 50),
  ('VIP3', 70),
  ('VIP4', 80),
  ('VIP5', 100),
  ('VIP6', 115),
  ('VIP7', 160),
  ('VIP8', 220),
  ('VIP9', 260),
  ('VIP10', 440)
ON CONFLICT (vip_level) DO UPDATE
SET rate_per_video = EXCLUDED.rate_per_video;

-- 4) Quick verification
-- SELECT vip_level, rate_per_video FROM public.video_earning_rates ORDER BY vip_level;