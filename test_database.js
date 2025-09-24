// Test database connection and table status
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://npliuqbormakkyggcgtw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbGl1cWJvcm1ha2t5Z2djZ3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTgzNTIsImV4cCI6MjA3MDEzNDM1Mn0.-rw3ZEVg3QYrP7DboDpx6KNFlx2jcoamTMvjd22DU2s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🔍 Testing database connection and tables...\n');

  try {
    // Test 1: Check if we can connect to Supabase
    console.log('1. Testing Supabase connection...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log('❌ Auth error:', authError.message);
    } else {
      console.log('✅ Supabase connection successful');
      console.log('   User:', user ? 'Authenticated' : 'Not authenticated');
    }

    // Test 2: Check users table
    console.log('\n2. Testing users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, auth_user_id, vip_level, income_wallet_balance, personal_wallet_balance')
      .limit(5);

    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
      console.log('   Found', users?.length || 0, 'users');
      if (users && users.length > 0) {
        console.log('   Sample user:', {
          id: users[0].id,
          vip_level: users[0].vip_level,
          income_wallet: users[0].income_wallet_balance,
          personal_wallet: users[0].personal_wallet_balance
        });
      }
    }

    // Test 3: Check task_completions table
    console.log('\n3. Testing task_completions table...');
    const { data: taskCompletions, error: taskCompletionsError } = await supabase
      .from('task_completions')
      .select('id, user_id, task_id, reward_earned, completed_at')
      .limit(5);

    if (taskCompletionsError) {
      console.log('❌ task_completions table error:', taskCompletionsError.message);
      console.log('   This table might not exist yet');
    } else {
      console.log('✅ task_completions table accessible');
      console.log('   Found', taskCompletions?.length || 0, 'task completions');
    }

    // Test 4: Check transactions table
    console.log('\n4. Testing transactions table...');
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, user_id, transaction_type, amount, created_at')
      .limit(5);

    if (transactionsError) {
      console.log('❌ transactions table error:', transactionsError.message);
      console.log('   This table might not exist yet');
    } else {
      console.log('✅ transactions table accessible');
      console.log('   Found', transactions?.length || 0, 'transactions');
    }

    // Test 5: Check membership_plans table
    console.log('\n5. Testing membership_plans table...');
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('id, name, daily_video_limit, price')
      .limit(5);

    if (plansError) {
      console.log('❌ membership_plans table error:', plansError.message);
    } else {
      console.log('✅ membership_plans table accessible');
      console.log('   Found', plans?.length || 0, 'membership plans');
      if (plans && plans.length > 0) {
        console.log('   Sample plan:', plans[0]);
      }
    }

    // Test 6: Try to create missing tables
    console.log('\n6. Attempting to create missing tables...');
    
    // Create task_completions table
    const { data: createTaskCompletions, error: createTaskCompletionsError } = await supabase
      .rpc('exec', {
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

    if (createTaskCompletionsError) {
      console.log('❌ Could not create task_completions table:', createTaskCompletionsError.message);
    } else {
      console.log('✅ task_completions table created successfully');
    }

    // Create transactions table
    const { data: createTransactions, error: createTransactionsError } = await supabase
      .rpc('exec', {
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

    if (createTransactionsError) {
      console.log('❌ Could not create transactions table:', createTransactionsError.message);
    } else {
      console.log('✅ transactions table created successfully');
    }

    console.log('\n🎯 Database test completed!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase();
