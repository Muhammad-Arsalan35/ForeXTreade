const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://woiccythjszfhbypacaa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k'
);

async function checkSchemaMismatch() {
  console.log('🔍 Checking for schema mismatches...\n');
  
  try {
    // Check users table structure
    console.log('1. Checking users table structure...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Error accessing users table:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
      if (usersData.length > 0) {
        console.log('   Columns found:', Object.keys(usersData[0]));
      }
    }
    
    // Check user_profiles table structure
    console.log('\n2. Checking user_profiles table structure...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ Error accessing user_profiles table:', profilesError.message);
    } else {
      console.log('✅ User_profiles table accessible');
      if (profilesData.length > 0) {
        console.log('   Columns found:', Object.keys(profilesData[0]));
      }
    }
    
    // Test the specific query that's failing in Dashboard
    console.log('\n3. Testing Dashboard query (auth_user_id)...');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();
      
      if (testError) {
        console.log('❌ Dashboard query failed:', testError.message);
        
        // Try with auth_id instead
        console.log('\n4. Testing with auth_id column...');
        const { data: testData2, error: testError2 } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', user.id)
          .single();
        
        if (testError2) {
          console.log('❌ auth_id query also failed:', testError2.message);
        } else {
          console.log('✅ auth_id query works! Found user:', testData2.username);
        }
      } else {
        console.log('✅ Dashboard query works');
      }
    }
    
    // Check membership_plans table
    console.log('\n5. Checking membership_plans table...');
    const { data: plansData, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .limit(1);
    
    if (plansError) {
      console.log('❌ Error accessing membership_plans:', plansError.message);
    } else {
      console.log('✅ Membership_plans table accessible');
      if (plansData.length > 0) {
        console.log('   Columns found:', Object.keys(plansData[0]));
      }
    }
    
  } catch (error) {
    console.error('❌ Error during schema check:', error.message);
  }
}

checkSchemaMismatch().catch(console.error);