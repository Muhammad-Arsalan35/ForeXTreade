const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Using service key for admin operations
);

async function applySchema() {
  console.log('🚀 APPLYING ULTRA SIMPLE TRIGGER FIX SCHEMA 🚀\n');
  
  try {
    // Read the schema file
    const schemaSQL = fs.readFileSync('ULTRA_SIMPLE_TRIGGER_FIX.sql', 'utf8');
    
    console.log('📄 Schema file loaded successfully');
    console.log(`📊 Schema size: ${schemaSQL.length} characters\n`);
    
    // Apply the schema
    console.log('⚡ Applying schema to database...');
    const { data, error } = await supabase.rpc('sql', { query: schemaSQL });
    
    if (error) {
      console.error('❌ Schema application failed:', error);
      return;
    }
    
    console.log('✅ Schema applied successfully!\n');
    
    // Verify the setup
    console.log('🔍 Verifying setup...');
    
    // Check if users table exists
    const { data: usersCheck, error: usersError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (usersError) {
      console.log('❌ Users table check failed:', usersError.message);
    } else {
      console.log('✅ Users table exists');
    }
    
    // Check if trigger function exists
    const { data: triggerCheck, error: triggerError } = await supabase.rpc('sql', {
      query: `
        SELECT EXISTS (
          SELECT 1 FROM pg_proc p 
          JOIN pg_namespace n ON p.pronamespace = n.oid 
          WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
        ) as trigger_exists;
      `
    });
    
    if (triggerError) {
      console.log('❌ Trigger function check failed:', triggerError.message);
    } else {
      console.log('✅ Trigger function exists:', triggerCheck[0]?.trigger_exists);
    }
    
    console.log('\n🎉 SCHEMA APPLICATION COMPLETE!');
    console.log('🔥 Your database is now ready for signup testing!');
    
  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

applySchema();