const { createClient } = require('@supabase/supabase-js');

// FXTrade Supabase configuration
const SUPABASE_URL = 'https://woiccythjszfhbypacaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM0NiwiZXhwIjoyMDc0MDU4MzQ2fQ.F1_wsNmySrDhGlstpi3HbAZFWuzFioeGWYTdYA6zlU0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkFXTradeDatabase() {
  console.log('🔍 Checking FXTrade Database...');
  console.log('Database URL:', SUPABASE_URL);
  
  try {
    // Check if task_completions table exists
    console.log('\n📋 Checking task_completions table...');
    const { data: taskCompletions, error: taskError } = await supabase
      .from('task_completions')
      .select('*')
      .limit(1);
    
    if (taskError) {
      if (taskError.code === 'PGRST205') {
        console.log('❌ task_completions table does NOT exist');
        console.log('\n🛠️ Creating task_completions table...');
        await createTaskCompletionsTable();
      } else {
        console.log('❌ Error checking task_completions:', taskError);
      }
    } else {
      console.log('✅ task_completions table exists');
      console.log('Sample data:', taskCompletions);
    }
    
    // Check users table
    console.log('\n👥 Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, vip_level')
      .limit(3);
    
    if (usersError) {
      console.log('❌ Error checking users:', usersError);
    } else {
      console.log('✅ Users table exists');
      console.log('Sample users:', users);
    }
    
    // Check membership_plans table
    console.log('\n📊 Checking membership_plans table...');
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('name, daily_video_limit')
      .limit(5);
    
    if (plansError) {
      console.log('❌ Error checking membership_plans:', plansError);
    } else {
      console.log('✅ membership_plans table exists');
      console.log('Available plans:', plans);
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

async function createTaskCompletionsTable() {
  try {
    const createTableSQL = `
      -- Create task_completions table
      CREATE TABLE IF NOT EXISTS public.task_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        task_id VARCHAR(255) NOT NULL,
        task_key VARCHAR(255),
        task_type VARCHAR(50) DEFAULT 'video',
        reward_earned DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_date DATE GENERATED ALWAYS AS (DATE(completed_at)) STORED,
        session_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON public.task_completions(user_id);
      CREATE INDEX IF NOT EXISTS idx_task_completions_completed_date ON public.task_completions(completed_date);
      CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON public.task_completions(task_id);

      -- Create unique constraint for daily task completion
      CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_user_task_daily 
      ON public.task_completions(user_id, task_id, completed_date);

      -- Enable Row Level Security
      ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies
      CREATE POLICY "Users can view their own task completions" ON public.task_completions
        FOR SELECT USING (auth.uid()::text = user_id::text);

      CREATE POLICY "Users can insert their own task completions" ON public.task_completions
        FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

      CREATE POLICY "Users can update their own task completions" ON public.task_completions
        FOR UPDATE USING (auth.uid()::text = user_id::text);
    `;

    console.log('📝 SQL to create task_completions table:');
    console.log(createTableSQL);
    console.log('\n⚠️ Please run this SQL manually in your Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/woiccythjszfhbypacaa/sql');
    
  } catch (error) {
    console.error('❌ Error creating table SQL:', error);
  }
}

// Run the check
checkFXTradeDatabase();