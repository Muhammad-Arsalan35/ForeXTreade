const { createClient } = require('@supabase/supabase-js');

// Get environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to users table...');

    // First, let's try to add the columns using ALTER TABLE through a stored procedure
    // We'll create a simple function to execute raw SQL
    
    console.log('\n1. Adding daily_task_limit column...');
    try {
      // Try to add daily_task_limit column
      const { data: result1, error: error1 } = await supabase
        .rpc('exec_sql', {
          query: 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS daily_task_limit INTEGER DEFAULT 3;'
        });
      
      if (error1) {
        console.log('RPC method not available, trying alternative approach...');
        
        // Alternative: Try to update a user record to see if column exists
        const { data: testData, error: testError } = await supabase
          .from('users')
          .update({ daily_task_limit: 3 })
          .eq('id', 'non-existent-id')
          .select();
          
        if (testError && testError.message.includes('column "daily_task_limit" of relation "users" does not exist')) {
          console.log('✗ daily_task_limit column does not exist and needs to be added manually');
        } else {
          console.log('✓ daily_task_limit column appears to exist');
        }
      } else {
        console.log('✓ daily_task_limit column added successfully');
      }
    } catch (err) {
      console.log('Error with daily_task_limit:', err.message);
    }

    console.log('\n2. Adding referral_count column...');
    try {
      const { data: result2, error: error2 } = await supabase
        .rpc('exec_sql', {
          query: 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;'
        });
      
      if (error2) {
        console.log('RPC method not available, trying alternative approach...');
        
        // Alternative: Try to update a user record to see if column exists
        const { data: testData, error: testError } = await supabase
          .from('users')
          .update({ referral_count: 0 })
          .eq('id', 'non-existent-id')
          .select();
          
        if (testError && testError.message.includes('column "referral_count" of relation "users" does not exist')) {
          console.log('✗ referral_count column does not exist and needs to be added manually');
        } else {
          console.log('✓ referral_count column appears to exist');
        }
      } else {
        console.log('✓ referral_count column added successfully');
      }
    } catch (err) {
      console.log('Error with referral_count:', err.message);
    }

    // Try to verify by fetching a user with the new columns
    console.log('\n3. Verifying columns exist...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, daily_task_limit, referral_count')
      .limit(1);

    if (usersError) {
      console.error('Error verifying columns:', usersError);
      console.log('\nThe columns likely need to be added manually through the Supabase dashboard.');
      console.log('Please run the following SQL in the Supabase SQL editor:');
      console.log('\nALTER TABLE public.users ADD COLUMN IF NOT EXISTS daily_task_limit INTEGER DEFAULT 3;');
      console.log('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;');
    } else {
      console.log('✓ Columns verified successfully!');
      if (users && users.length > 0) {
        console.log('Sample data:', users[0]);
      }
    }

  } catch (error) {
    console.error('Error:', error);
    console.log('\nManual SQL needed:');
    console.log('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS daily_task_limit INTEGER DEFAULT 3;');
    console.log('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;');
  }
}

addMissingColumns();