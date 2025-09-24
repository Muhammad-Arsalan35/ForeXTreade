const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkEnumTypes() {
  console.log('🔍 Checking existing enum types...\n');

  try {
    // Check what enum types exist
    console.log('1. Checking existing enum types...');
    const { data: enumTypes, error: enumError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            t.typname as enum_name,
            array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
          FROM pg_type t 
          JOIN pg_enum e ON t.oid = e.enumtypid  
          WHERE t.typtype = 'e'
          GROUP BY t.typname
          ORDER BY t.typname;
        `
      });

    if (enumError) {
      console.error('❌ Error checking enum types:', enumError);
    } else {
      console.log('✅ Existing enum types:');
      enumTypes?.forEach(enumType => {
        console.log(`   - ${enumType.enum_name}: [${enumType.enum_values.join(', ')}]`);
      });
    }

    // Check user_profiles table structure
    console.log('\n2. Checking user_profiles table structure...');
    const { data: columns, error: colError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            column_name, 
            data_type, 
            udt_name,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = 'user_profiles' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });

    if (colError) {
      console.error('❌ Error checking columns:', colError);
    } else {
      console.log('✅ user_profiles columns:');
      columns?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.udt_name}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }

    // Check what values are currently in membership_level column (if it exists)
    console.log('\n3. Checking current membership_level values...');
    const { data: membershipValues, error: valError } = await supabase
      .from('user_profiles')
      .select('membership_level')
      .limit(10);

    if (valError) {
      console.error('❌ Error checking membership values:', valError);
    } else {
      const uniqueValues = [...new Set(membershipValues?.map(v => v.membership_level))];
      console.log('✅ Current membership_level values:', uniqueValues);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkEnumTypes();