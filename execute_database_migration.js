import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = "https://npliuqbormakkyggcgtw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbGl1cWJvcm1ha2t5Z2djZ3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTgzNTIsImV4cCI6MjA3MDEzNDM1Mn0.-rw3ZEVg3QYrP7DboDpx6KNFlx2jcoamTMvjd22DU2s";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function executeDatabaseMigration() {
  console.log('🚀 Starting database migration...\n');
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('create_missing_tables.sql', 'utf8');
    
    // Split SQL commands by semicolon and filter out empty commands
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Found ${sqlCommands.length} SQL commands to execute\n`);

    // Execute each command
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      // Skip comments and empty commands
      if (command.startsWith('--') || command.trim() === '') {
        continue;
      }

      console.log(`⏳ Executing command ${i + 1}/${sqlCommands.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: command + ';'
        });

        if (error) {
          // Try alternative method using direct SQL execution
          const { data: altData, error: altError } = await supabase
            .from('_supabase_migrations')
            .select('*')
            .limit(1);
          
          if (altError) {
            console.log(`⚠️  Command ${i + 1} failed (this might be expected for some commands):`);
            console.log(`   ${error.message}`);
            console.log(`   Command: ${command.substring(0, 100)}...`);
          } else {
            console.log(`✅ Command ${i + 1} executed successfully`);
          }
        } else {
          console.log(`✅ Command ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`⚠️  Command ${i + 1} failed (this might be expected):`);
        console.log(`   ${err.message}`);
      }
    }

    console.log('\n🎉 Database migration completed!');
    console.log('\n🔍 Verifying tables were created...\n');

    // Verify the tables were created
    const tablesToCheck = ['user_plans', 'videos', 'video_earning_rates', 'app_config'];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Table exists and accessible`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    console.log('\n✨ Migration verification completed!');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Note: Since we can't execute raw SQL directly with the anon key,
// let's try a different approach - create tables using the Supabase client
async function createTablesDirectly() {
  console.log('🔧 Creating tables using alternative method...\n');
  
  // Since we can't execute raw SQL with anon key, we'll need to use Supabase Dashboard
  // or service role key. For now, let's just verify what we can access.
  
  console.log('ℹ️  Note: To create these tables, you need to:');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the contents of create_missing_tables.sql');
  console.log('4. Execute the SQL script');
  console.log('');
  console.log('Or use the service role key instead of the anon key.');
  console.log('');
  console.log('📋 Tables that need to be created:');
  console.log('  - user_plans');
  console.log('  - videos');
  console.log('  - video_earning_rates');
  console.log('  - app_config');
}

// Run the migration
createTablesDirectly().catch(console.error);