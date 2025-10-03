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

async function checkUsersTableStructure() {
  try {
    console.log('Checking users table structure...');
    
    // Get table structure by querying information_schema
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'users')
      .eq('table_schema', 'public');

    if (columnsError) {
      console.error('Error fetching table structure:', columnsError);
      return;
    }

    console.log('\nUsers table columns:');
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });

    // Check for specific missing columns
    const requiredColumns = ['daily_task_limit', 'referral_count'];
    const existingColumns = columns.map(col => col.column_name);
    
    console.log('\nChecking for required columns:');
    requiredColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`- ${col}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
    });

    // Try to fetch a sample user to see actual data structure
    console.log('\nTrying to fetch sample user data...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else if (users && users.length > 0) {
      console.log('\nSample user data structure:');
      console.log(Object.keys(users[0]));
    } else {
      console.log('No users found in table');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsersTableStructure();