// Test script to verify authentication flow
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://woiccythjszfhbypacaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM0NiwiZXhwIjoyMDc0MDU4MzQ2fQ.F1_wsNmySrDhGlstpi3HbAZFWuzFioeGWYTdYA6zlU0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testAuthFlow() {
  console.log('🧪 Starting Authentication Flow Test...\n');

  // Test data
  const testUser = {
    phone: '+923001234567',
    email: '923001234567@forextrade.com',
    password: 'TestPass123!',
    fullName: 'Test User',
    username: 'testuser123'
  };

  try {
    // Step 1: Test Signup
    console.log('📝 Step 1: Testing Signup...');
    
    // First, try to sign up
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          phone_number: testUser.phone,
          full_name: testUser.fullName,
          username: testUser.username
        }
      }
    });

    if (signupError) {
      console.log('❌ Signup Error:', signupError.message);
      
      // If user already exists, try to sign in instead
      if (signupError.message.includes('User already registered')) {
        console.log('👤 User already exists, testing login instead...');
        return await testLogin(testUser);
      }
      return;
    }

    console.log('✅ Signup successful!');
    console.log('User ID:', signupData.user?.id);

    // Step 2: Create user profile using service client
    console.log('\n📊 Step 2: Creating user profile...');
    
    const { error: profileError } = await supabaseService
      .from('users')
      .insert({
        auth_user_id: signupData.user.id,
        full_name: testUser.fullName,
        username: testUser.username,
        phone_number: testUser.phone,
        vip_level: 'VIP1',
        user_status: 'active',
        referral_code: Math.floor(100000 + Math.random() * 900000).toString(),
        personal_wallet_balance: 0.00,
        income_wallet_balance: 0.00,
        total_earnings: 0.00,
        total_invested: 0.00,
        position_title: 'Member',
        referred_by: null
      });

    if (profileError) {
      console.log('❌ Profile Creation Error:', profileError.message);
      return;
    }

    console.log('✅ Profile created successfully!');

    // Step 3: Test Login
    await testLogin(testUser);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testLogin(testUser) {
  console.log('\n🔐 Step 3: Testing Login...');
  
  try {
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });

    if (loginError) {
      console.log('❌ Login Error:', loginError.message);
      return;
    }

    console.log('✅ Login successful!');
    console.log('User ID:', loginData.user?.id);

    // Step 4: Test user data retrieval
    console.log('\n📋 Step 4: Testing user data retrieval...');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', loginData.user.id)
      .single();

    if (userError) {
      console.log('❌ User Data Error:', userError.message);
      return;
    }

    console.log('✅ User data retrieved successfully!');
    console.log('User Details:', {
      id: userData.id,
      full_name: userData.full_name,
      username: userData.username,
      phone_number: userData.phone_number,
      vip_level: userData.vip_level,
      user_status: userData.user_status,
      personal_wallet_balance: userData.personal_wallet_balance,
      income_wallet_balance: userData.income_wallet_balance
    });

    console.log('\n🎉 All tests passed! Authentication system is working correctly.');
    
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
  }
}

// Run the test
testAuthFlow();