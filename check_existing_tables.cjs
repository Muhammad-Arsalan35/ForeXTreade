const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkExistingTables() {
  try {
    console.log('🔍 Checking which tables exist in the database...\n');
    
    // Query to get all tables in the public schema
    const { data, error } = await supabase.rpc('sql', {
      query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `
    });

    if (error) {
      console.log('❌ Cannot use RPC function. Trying alternative method...');
      
      // Try to check specific tables by attempting to select from them
      const tablesToCheck = [
        'users', 'videos', 'daily_video_tasks', 'user_memberships', 
        'vip_levels', 'financial_records', 'referrals', 'invites'
      ];
      
      console.log('📋 Checking specific tables:\n');
      
      for (const table of tablesToCheck) {
        try {
          const { error: tableError } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (tableError) {
            console.log(`❌ ${table}: Does not exist or no access`);
          } else {
            console.log(`✅ ${table}: Exists and accessible`);
          }
        } catch (err) {
          console.log(`❌ ${table}: Error - ${err.message}`);
        }
      }
    } else {
      console.log('📋 Tables found in public schema:');
      if (data && data.length > 0) {
        data.forEach(row => {
          console.log(`✅ ${row.table_name}`);
        });
      } else {
        console.log('❌ No tables found in public schema');
      }
    }

  } catch (err) {
    console.error('❌ Error checking tables:', err.message);
  }
}

checkExistingTables();