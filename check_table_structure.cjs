require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('🔍 Checking table structures...\n');
  
  try {
    // Check user_profiles table structure
    console.log('📋 User Profiles Table Structure:');
    const { data: userProfilesData, error: userProfilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (userProfilesError) {
      console.log('❌ Error accessing user_profiles:', userProfilesError);
    } else {
      console.log('✅ Sample user_profiles record:', userProfilesData);
      if (userProfilesData.length > 0) {
        console.log('📊 Columns in user_profiles:', Object.keys(userProfilesData[0]));
      } else {
        console.log('📊 No records in user_profiles table');
      }
    }
    
    console.log('\n📋 Membership Plans Table Structure:');
    const { data: membershipData, error: membershipError } = await supabase
      .from('membership_plans')
      .select('*')
      .limit(1);
    
    if (membershipError) {
      console.log('❌ Error accessing membership_plans:', membershipError);
    } else {
      console.log('✅ Sample membership_plans record:', membershipData);
      if (membershipData.length > 0) {
        console.log('📊 Columns in membership_plans:', Object.keys(membershipData[0]));
      }
    }
    
    // Try to get table schema information
    console.log('\n🔍 Attempting to get schema information...');
    
    // Check if we can access information_schema
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'user_profiles' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
    
    if (schemaError) {
      console.log('❌ Cannot access schema information:', schemaError);
    } else {
      console.log('✅ user_profiles schema:', schemaData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTableStructure();