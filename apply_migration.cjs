const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Get environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = 'supabase/migrations/20250929000000_add_missing_user_columns.sql';
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration to add missing user columns...');
    
    // Since we can't execute DDL directly through the client, let's try a different approach
    // We'll use the REST API to execute the SQL
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        sql: sqlContent
      })
    });

    if (!response.ok) {
      console.log('Direct SQL execution not available. Trying alternative approach...');
      
      // Alternative: Try to add columns one by one using individual statements
      console.log('\nTrying to add columns individually...');
      
      // Check if daily_task_limit exists by trying to select it
      try {
        const { data, error } = await supabase
          .from('users')
          .select('daily_task_limit')
          .limit(1);
          
        if (error && error.message.includes('does not exist')) {
          console.log('✗ daily_task_limit column missing');
        } else {
          console.log('✓ daily_task_limit column exists');
        }
      } catch (err) {
        console.log('Error checking daily_task_limit:', err.message);
      }
      
      // Check if referral_count exists
      try {
        const { data, error } = await supabase
          .from('users')
          .select('referral_count')
          .limit(1);
          
        if (error && error.message.includes('does not exist')) {
          console.log('✗ referral_count column missing');
        } else {
          console.log('✓ referral_count column exists');
        }
      } catch (err) {
        console.log('Error checking referral_count:', err.message);
      }
      
      console.log('\n=== MANUAL MIGRATION REQUIRED ===');
      console.log('Please execute the following SQL in the Supabase dashboard:');
      console.log('\n' + sqlContent);
      
    } else {
      const result = await response.json();
      console.log('✓ Migration applied successfully:', result);
    }

  } catch (error) {
    console.error('Error applying migration:', error);
    console.log('\n=== MANUAL MIGRATION REQUIRED ===');
    console.log('Please execute the SQL file manually in the Supabase dashboard:');
    console.log('supabase/migrations/20250929000000_add_missing_user_columns.sql');
  }
}

applyMigration();