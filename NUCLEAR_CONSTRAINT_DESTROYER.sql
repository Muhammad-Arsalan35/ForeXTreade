-- ============================================================================
-- NUCLEAR CONSTRAINT DESTROYER - MAXIMUM FORCE
-- ============================================================================
-- This script uses EVERY possible method to remove the constraint
-- ============================================================================

-- STEP 1: Show current state with detailed info
SELECT 
    '🔍 CURRENT CONSTRAINT STATUS:' as info,
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    tc.table_schema,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'users' 
    AND tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY';

-- STEP 2: NUCLEAR REMOVAL - Method 1 (Standard)
DO $$
BEGIN
    RAISE NOTICE '🚀 Starting Method 1: Standard removal...';
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey CASCADE;
    RAISE NOTICE '✅ Method 1 completed';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Method 1 failed: %', SQLERRM;
END $$;

-- STEP 3: NUCLEAR REMOVAL - Method 2 (Dynamic SQL)
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🚀 Starting Method 2: Dynamic SQL removal...';
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_auth_user_id_fkey' 
        AND table_name = 'users' 
        AND table_schema = 'public'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT users_auth_user_id_fkey CASCADE';
        RAISE NOTICE '✅ Method 2: Constraint removed successfully';
    ELSE
        RAISE NOTICE '✅ Method 2: Constraint already gone';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Method 2 failed: %', SQLERRM;
END $$;

-- STEP 4: NUCLEAR REMOVAL - Method 3 (Force with pg_constraint)
DO $$
DECLARE
    constraint_oid OID;
BEGIN
    RAISE NOTICE '🚀 Starting Method 3: Direct pg_constraint removal...';
    
    SELECT c.oid INTO constraint_oid
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'users_auth_user_id_fkey'
    AND t.relname = 'users'
    AND n.nspname = 'public';
    
    IF constraint_oid IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I CASCADE', 
                      (SELECT conname FROM pg_constraint WHERE oid = constraint_oid));
        RAISE NOTICE '✅ Method 3: Constraint removed via pg_constraint';
    ELSE
        RAISE NOTICE '✅ Method 3: No constraint found in pg_constraint';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Method 3 failed: %', SQLERRM;
END $$;

-- STEP 5: NUCLEAR REMOVAL - Method 4 (All possible names)
DO $$
DECLARE
    constraint_names TEXT[] := ARRAY[
        'users_auth_user_id_fkey',
        'fk_users_auth_user_id',
        'users_auth_user_id_foreign',
        'users_auth_user_id_fk',
        'users_auth_user_id_key',
        'fk_users_auth',
        'users_auth_fkey'
    ];
    constraint_name TEXT;
BEGIN
    RAISE NOTICE '🚀 Starting Method 4: All possible constraint names...';
    
    FOREACH constraint_name IN ARRAY constraint_names
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_name);
            RAISE NOTICE '✅ Method 4: Attempted removal of %', constraint_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Method 4: Could not remove % - %', constraint_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ Method 4 completed';
END $$;

-- STEP 6: VERIFICATION - Show what's left
SELECT 
    '🔍 AFTER NUCLEAR REMOVAL:' as info,
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'users' 
    AND tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY';

-- STEP 7: FINAL VERIFICATION AND STATUS
DO $$
DECLARE
    fk_count INTEGER;
    constraint_list TEXT;
BEGIN
    -- Count remaining foreign keys
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'users' 
    AND table_schema = 'public' 
    AND constraint_type = 'FOREIGN KEY';
    
    -- Get list of remaining constraints
    SELECT string_agg(constraint_name, ', ') INTO constraint_list
    FROM information_schema.table_constraints 
    WHERE table_name = 'users' 
    AND table_schema = 'public' 
    AND constraint_type = 'FOREIGN KEY';
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    
    IF fk_count = 0 THEN
        RAISE NOTICE '🎉 NUCLEAR SUCCESS: ALL FOREIGN KEY CONSTRAINTS DESTROYED!';
        RAISE NOTICE '🎉 The users table is now constraint-free!';
    ELSE
        RAISE NOTICE '💥 NUCLEAR FAILURE: % constraint(s) survived the blast:', fk_count;
        RAISE NOTICE '💥 Surviving constraints: %', COALESCE(constraint_list, 'Unknown');
        RAISE NOTICE '💥 This indicates a deeper system issue!';
    END IF;
    
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- EMERGENCY INSTRUCTIONS:
-- ============================================================================
-- 1. Copy this ENTIRE script
-- 2. Go to Supabase Dashboard > SQL Editor  
-- 3. Create a new query and paste this script
-- 4. Click "RUN" and wait for completion
-- 5. Look for "NUCLEAR SUCCESS: ALL FOREIGN KEY CONSTRAINTS DESTROYED!"
-- 6. If you see "NUCLEAR FAILURE", there's a deeper system issue
-- 7. If successful, immediately test: node test_signup_simple.cjs
-- ============================================================================