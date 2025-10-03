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

async function checkUsersTable() {
  try {
    console.log('Checking users table...');
    
    // Try to fetch one user to see the structure
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    if (users && users.length > 0) {
      console.log('\nUsers table columns found:');
      const columns = Object.keys(users[0]);
      columns.forEach(col => {
        console.log(`- ${col}: ${typeof users[0][col]} (value: ${users[0][col]})`);
      });

      // Check for specific missing columns
      const requiredColumns = ['daily_task_limit', 'referral_count'];
      console.log('\nChecking for required columns:');
      requiredColumns.forEach(col => {
        const exists = columns.includes(col);
        console.log(`- ${col}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
      });
    } else {
      console.log('No users found in table');
      
      // Try to insert a test record to see what columns are expected
      console.log('\nTrying to create a test user to see required columns...');
      const { data, error } = await supabase
        .from('users')
        .insert({
          username: 'test_user_' + Date.now(),
          email: 'test@example.com'
        })
        .select();

      if (error) {
        console.error('Error creating test user:', error);
        console.log('This error might reveal missing columns or constraints');
      } else {
        console.log('Test user created successfully:', data);
        
        // Clean up test user
        if (data && data.length > 0) {
          await supabase
            .from('users')
            .delete()
            .eq('id', data[0].id);
          console.log('Test user cleaned up');
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsersTable();