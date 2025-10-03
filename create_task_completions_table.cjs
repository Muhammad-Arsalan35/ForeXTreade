const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin access
const supabase = createClient(
  'https://woiccythjszfhbypacaa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM0NiwiZXhwIjoyMDc0MDU4MzQ2fQ.F1_wsNmySrDhGlstpi3HbAZFWuzFioeGWYTdYA6zlU0'
);

async function createTaskCompletionsTable() {
  console.log('🚀 Creating task_completions table...');
  
  try {
    // First, check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('task_completions')
      .select('count')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Table already exists!');
      return;
    }
    
    console.log('📝 Table does not exist, creating it...');
    
    // Since we can't execute raw SQL directly, let's try to create a simple record
    // to trigger table creation if it has auto-creation enabled
    console.log('❌ Cannot create table directly via Supabase client');
    console.log('💡 Please create the table manually in Supabase dashboard:');
    console.log(`
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR(100) NOT NULL,
  task_key VARCHAR(200),
  task_type VARCHAR(50) DEFAULT 'video',
  reward_earned DECIMAL(10,2) DEFAULT 0.00,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_date DATE GENERATED ALWAYS AS (completed_at::date) STORED,
  session_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_at ON task_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_date ON task_completions(completed_date);

-- Create a unique constraint for daily task completion
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_daily_unique 
ON task_completions(user_id, task_id, completed_date);

-- Enable RLS
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own task completions" ON task_completions
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert own task completions" ON task_completions
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can update own task completions" ON task_completions
  FOR UPDATE USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));
`);
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
}

createTaskCompletionsTable();