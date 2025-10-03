const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testSignupWithoutPositionTitle() {
  console.log('🧪 TESTING SIGNUP WITHOUT POSITION_TITLE REFERENCES...\n');
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testPhone = `+1234567${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  
  try {
    console.log('1️⃣ Testing user signup...');
    
    // Test signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          phone_number: testPhone
        }
      }
    });
    
    if (authError) {
      console.log('❌ Signup failed:', authError);
      return;
    }
    
    console.log('✅ User signup successful');
    console.log(`   - User ID: ${authData.user?.id}`);
    console.log(`   - Email: ${authData.user?.email}`);
    
    // Wait a moment for any triggers to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n2️⃣ Testing profile creation with minimal fields...');
    
    // Try to create a profile manually with only basic fields
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        full_name: 'Test User',
        username: `test_${Date.now()}`,
        phone_number: testPhone,
        referral_code: Math.random().toString(36).substring(2, 10).toUpperCase()
        // Only using basic fields that should exist
      })
      .select()
      .single();
    
    if (profileError) {
      console.log('❌ Profile creation failed:', profileError);
      
      // Check if it's the position_title error
      if (profileError.message && profileError.message.includes('position_title')) {
        console.log('🚨 POSITION_TITLE ERROR STILL EXISTS!');
      } else {
        console.log('ℹ️ Different error - this might be expected if the column doesn\'t exist');
      }
      
      // Let's try to see what columns are actually available
      console.log('\n3️⃣ Testing what happens when we try to read from users table...');
      
      const { data: existingUsers, error: readError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (readError) {
        console.log('❌ Cannot read users table:', readError);
        
        if (readError.message && readError.message.includes('position_title')) {
          console.log('🚨 POSITION_TITLE ERROR FOUND IN READ OPERATION!');
          console.log('   This means the frontend is still trying to access position_title');
        }
      } else {
        console.log('✅ Can read users table successfully');
        if (existingUsers && existingUsers.length > 0) {
          console.log('   Available columns:', Object.keys(existingUsers[0]).join(', '));
        }
      }
      
      return;
    }
    
    console.log('✅ Profile creation successful');
    console.log(`   - Profile ID: ${profileData.id}`);
    console.log(`   - Username: ${profileData.username}`);
    
    console.log('\n4️⃣ Testing sign-in...');
    
    // Test sign-in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.log('❌ Sign-in failed:', signInError);
      return;
    }
    
    console.log('✅ Sign-in successful');
    
    console.log('\n5️⃣ Testing profile access...');
    
    // Test accessing the profile
    const { data: userProfile, error: userProfileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();
    
    if (userProfileError) {
      console.log('❌ Profile access failed:', userProfileError);
      
      // Check if it's the position_title error
      if (userProfileError.message && userProfileError.message.includes('position_title')) {
        console.log('🚨 POSITION_TITLE ERROR STILL EXISTS IN PROFILE ACCESS!');
      }
      return;
    }
    
    console.log('✅ Profile access successful');
    console.log(`   - User profile retrieved without position_title errors`);
    
    console.log('\n🎉 ALL TESTS PASSED! The position_title error has been fixed.');
    
    // Cleanup
    console.log('\n🧹 Cleaning up test user...');
    await supabase
      .from('users')
      .delete()
      .eq('auth_user_id', authData.user.id);
    
    console.log('✅ Cleanup completed');
    
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  }
}

testSignupWithoutPositionTitle();