const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQLFix() {
  console.log('🔧 RUNNING SQL FIX');
  console.log('==================\n');

  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('./Fix_missing _tables_and_rls.sql', 'utf8');
    
    console.log('📝 SQL file loaded successfully');
    console.log(`📊 File size: ${sqlContent.length} characters\n`);

    // Try to execute the SQL
    console.log('⚡ Executing SQL...');
    
    // Note: This might not work due to Supabase client limitations
    // If it fails, you'll need to use the Supabase Dashboard
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });

    if (error) {
      console.log('❌ Error executing SQL:', error.message);
      console.log('\n📋 ALTERNATIVE SOLUTION:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of Fix_missing _tables_and_rls.sql');
      console.log('4. Click "Run"');
    } else {
      console.log('✅ SQL executed successfully!');
      console.log('🎉 Database fixes applied!');
    }

  } catch (error) {
    console.error('❌ Failed to run SQL fix:', error.message);
    console.log('\n📋 MANUAL SOLUTION:');
    console.log('1. Open Supabase Dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Paste the SQL from Fix_missing _tables_and_rls.sql');
    console.log('4. Execute it manually');
  }
}

runSQLFix().catch(console.error);