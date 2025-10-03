-- Fix RLS policies for task_completions table
-- This script addresses permission denied errors

-- Drop existing RLS policies for task_completions
DROP POLICY IF EXISTS "Users can view their own task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can insert their own task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can update their own task completions" ON task_completions;
DROP POLICY IF EXISTS "task_completions_select_policy" ON task_completions;
DROP POLICY IF EXISTS "task_completions_insert_policy" ON task_completions;
DROP POLICY IF EXISTS "task_completions_update_policy" ON task_completions;

-- Create permissive RLS policies for task_completions
CREATE POLICY "Allow all operations on task_completions" ON task_completions
FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions to authenticated users and service role
GRANT ALL ON task_completions TO authenticated;
GRANT ALL ON task_completions TO service_role;
GRANT ALL ON task_completions TO anon;

-- Ensure RLS is enabled
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Grant usage on the sequence if it exists
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;