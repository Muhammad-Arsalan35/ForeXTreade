-- ============================================================================
-- EMERGENCY CONSTRAINT KILLER - ULTRA SIMPLE
-- ============================================================================
-- This script has ONE JOB: Remove the users_auth_user_id_fkey constraint
-- ============================================================================

-- STEP 1: Show what we're dealing with
SELECT 
    'BEFORE REMOVAL - CONSTRAINTS ON USERS TABLE:' as status,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND constraint_type = 'FOREIGN KEY';

-- STEP 2: NUCLEAR CONSTRAINT REMOVAL (Multiple attempts)
-- ============================================================================

-- Attempt 1: Standard removal
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey CASCADE;

-- Attempt 2: Force removal with different syntax
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_auth_user_id_fkey' 
        AND table_name = 'users' 
        AND table_schema = 'public'
    ) THEN
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT users_auth_user_id_fkey CASCADE';
        RAISE NOTICE '✅ Successfully removed users_auth_user_id_fkey';
    ELSE
        RAISE NOTICE '✅ users_auth_user_id_fkey was already removed or does not exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error removing constraint: %', SQLERRM;
END $$;

-- Attempt 3: Try alternative constraint names
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS fk_users_auth_user_id CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_user_id_foreign CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_user_id_fk CASCADE;

-- STEP 3: Verify removal
SELECT 
    'AFTER REMOVAL - REMAINING CONSTRAINTS:' as status,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND constraint_type = 'FOREIGN KEY';

-- STEP 4: Final verification with count
DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'users' 
    AND table_schema = 'public' 
    AND constraint_type = 'FOREIGN KEY';
    
    IF fk_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 ════════════════════════════════════════════════════';
        RAISE NOTICE '🎉 SUCCESS: ALL FOREIGN KEY CONSTRAINTS REMOVED!';
        RAISE NOTICE '🎉 ════════════════════════════════════════════════════';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '❌ ════════════════════════════════════════════════════';
        RAISE NOTICE '❌ FAILURE: % foreign key constraint(s) still exist', fk_count;
        RAISE NOTICE '❌ ════════════════════════════════════════════════════';
        RAISE NOTICE '';
    END IF;
END $$;

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Copy this ENTIRE script
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Create a new query and paste this script
-- 4. Click "RUN" and wait for completion
-- 5. Look for "SUCCESS: ALL FOREIGN KEY CONSTRAINTS REMOVED!"
-- 6. If successful, immediately test: node test_signup_simple.cjs
-- ============================================================================