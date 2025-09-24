const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://woiccythjszfhbypacaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignupIssue() {
  try {
    console.log('🔍 Testing Signup Issue - Why VIP1 instead of Intern...\n');

    // 1. Check current users table structure
    console.log('📋 Current Users in Database:');
    console.log('============================');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, vip_level, created_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.full_name}`);
        console.log(`   VIP Level: ${user.vip_level || 'NULL'}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // 2. Check user_profiles table
    console.log('👤 User Profiles:');
    console.log('=================');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, membership_type, membership_level')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Error fetching user profiles:', profilesError);
    } else {
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.full_name}`);
        console.log(`   Membership Type: ${profile.membership_type || 'NULL'}`);
        console.log(`   Membership Level: ${profile.membership_level || 'NULL'}`);
        console.log('');
      });
    }

    // 3. Test creating a new user to see what happens
    console.log('🧪 Testing New User Creation:');
    console.log('=============================');
    
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`Creating test user: ${testEmail}`);
    
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User Signup',
          username: 'testuser',
          phone_number: '+1234567890'
        }
      }
    });

    if (signupError) {
      console.error('❌ Signup error:', signupError);
      return;
    }

    console.log('✅ Auth user created successfully');
    console.log('Auth User ID:', authData.user?.id);

    // Wait a moment for triggers to execute
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if user was created in users table
    const { data: newUser, error: newUserError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authData.user?.id)
      .single();

    if (newUserError) {
      console.error('❌ Error fetching new user from users table:', newUserError);
    } else {
      console.log('✅ User created in users table:');
      console.log(`   Full Name: ${newUser.full_name}`);
      console.log(`   VIP Level: ${newUser.vip_level || 'NULL'}`);
      console.log(`   User Status: ${newUser.user_status}`);
    }

    // Check if user profile was created
    const { data: newProfile, error: newProfileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', newUser?.id)
      .single();

    if (newProfileError) {
      console.error('❌ Error fetching new user profile:', newProfileError);
    } else {
      console.log('✅ User profile created:');
      console.log(`   Membership Type: ${newProfile.membership_type}`);
      console.log(`   Membership Level: ${newProfile.membership_level}`);
    }

    // 4. Check the default values in the database schema
    console.log('\n🔧 Checking Database Schema Defaults:');
    console.log('=====================================');
    
    // Try to get table schema information
    const { data: schemaInfo, error: schemaError } = await supabase
      .rpc('get_table_schema', { table_name: 'users' })
      .single();

    if (schemaError) {
      console.log('Cannot fetch schema info directly, checking manually...');
    }

    // Clean up test user
    console.log('\n🧹 Cleaning up test user...');
    if (newUser?.id) {
      await supabase.from('user_profiles').delete().eq('user_id', newUser.id);
      await supabase.from('users').delete().eq('id', newUser.id);
      console.log('✅ Test user cleaned up');
    }

    console.log('\n✅ Signup issue test completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testSignupIssue();