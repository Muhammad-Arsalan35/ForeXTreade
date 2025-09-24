-- ============================================================================
-- FINAL DATA CLEANUP - Fix remaining data inconsistencies
-- ============================================================================

-- Fix user profiles with incorrect membership_level and vip_level values
UPDATE public.user_profiles 
SET 
    membership_level = 'trial',
    vip_level = 0
WHERE membership_level != 'trial' OR vip_level != 0;

-- Ensure all new users get proper trial membership
UPDATE public.user_profiles 
SET 
    membership_level = 'trial',
    vip_level = 0,
    trial_tasks_completed = COALESCE(trial_tasks_completed, 0)
WHERE membership_level IS NULL OR vip_level IS NULL;

-- Verification queries
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN membership_level = 'trial' THEN 1 END) as trial_profiles,
    COUNT(CASE WHEN vip_level = 0 THEN 1 END) as vip_level_0_profiles
FROM public.user_profiles;

SELECT DISTINCT membership_level, vip_level, COUNT(*) 
FROM public.user_profiles 
GROUP BY membership_level, vip_level 
ORDER BY vip_level;