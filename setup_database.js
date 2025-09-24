// Simple script to create missing database tables
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://npliuqbormakkyggcgtw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbGl1cWJvcm1ha2t5Z2djZ3R3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjY5NzQ4MCwiZXhwIjoyMDUyMjc0NDgwfQ.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('Creating missing database tables...');
  
  try {
    // Create task_completions table
    const { data: taskCompletionsResult, error: taskCompletionsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS task_completions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            task_id VARCHAR(100) NOT NULL,
            task_key VARCHAR(200),
            task_type VARCHAR(50) DEFAULT 'video',
            reward_earned DECIMAL(10,2) DEFAULT 0.00,
            completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            session_id VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, task_id, DATE(completed_at))
          );
        `
      });

    if (taskCompletionsError) {
      console.error('Error creating task_completions table:', taskCompletionsError);
    } else {
      console.log('✅ task_completions table created successfully');
    }

    // Create transactions table
    const { data: transactionsResult, error: transactionsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            transaction_type VARCHAR(50) NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            description TEXT,
            status VARCHAR(20) DEFAULT 'completed',
            reference_id VARCHAR(100),
            reference_type VARCHAR(50),
            balance_before DECIMAL(12,2),
            balance_after DECIMAL(12,2),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });

    if (transactionsError) {
      console.error('Error creating transactions table:', transactionsError);
    } else {
      console.log('✅ transactions table created successfully');
    }

    // Enable RLS
    const { data: rlsResult, error: rlsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
          ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
        `
      });

    if (rlsError) {
      console.error('Error enabling RLS:', rlsError);
    } else {
      console.log('✅ RLS enabled successfully');
    }

    console.log('Database setup completed!');
    
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

createTables();

