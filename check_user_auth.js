// Check user authentication and database status
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://npliuqbormakkyggcgtw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbGl1cWJvcm1ha2t5Z2djZ3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTgzNTIsImV4cCI6MjA3MDEzNDM1Mn0.-rw3ZEVg3QYrP7DboDpx6KNFlx2jcoamTMvjd22DU2s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserAuth() {
  console.log('🔍 Checking user authentication and database status...\n');

  try {
    // Check current auth state
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Auth error:', authError.message);
    } else if (user) {
      console.log('✅ User authenticated:', user.email);
      console.log('   User ID:', user.id);
      
      // Check if user exists in users table
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('id, auth_user_id, vip_level, income_wallet_balance, personal_wallet_balance')
        .eq('auth_user_id', user.id)
        .single();
      
      if (dbError) {
        console.log('❌ User not found in database:', dbError.message);
        console.log('   This means the user profile was not created properly');
      } else {
        console.log('✅ User found in database:', {
          id: dbUser.id,
          vip_level: dbUser.vip_level,
          income_wallet: dbUser.income_wallet_balance,
          personal_wallet: dbUser.personal_wallet_balance
        });
      }
    } else {
      console.log('❌ No user authenticated');
      console.log('   User needs to log in first');
    }

    // Check if task_completions table exists
    console.log('\n🔍 Checking task_completions table...');
    const { data: taskCompletions, error: taskCompletionsError } = await supabase
      .from('task_completions')
      .select('id')
      .limit(1);

    if (taskCompletionsError) {
      console.log('❌ task_completions table does not exist:', taskCompletionsError.message);
      console.log('   This is why task completion is failing!');
    } else {
      console.log('✅ task_completions table exists');
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkUserAuth();





