const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
    const testEmail = `test_final_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log('🧪 TESTING SIGNUP AFTER SQL FIX...');
    console.log(`📧 Test email: ${testEmail}\n`);

    try {
        // Test signup
        console.log('1. Attempting signup...');
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    full_name: 'Test User Final'
                }
            }
        });

        if (signupError) {
            console.error('❌ SIGNUP FAILED:', signupError.message);
            return;
        }

        console.log('✅ Signup successful!');
        console.log(`   User ID: ${signupData.user?.id}`);
        console.log(`   Email: ${signupData.user?.email}`);

        // Wait a moment for trigger to execute
        console.log('\n2. Waiting for trigger to execute...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if user profile was created
        console.log('3. Checking for user profile...');
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', signupData.user.id)
            .single();

        if (profileError || !profile) {
            console.error('❌ NO PROFILE CREATED - Trigger is not working!');
            console.error('   Error:', profileError?.message || 'Profile not found');
        } else {
            console.log('✅ Profile created successfully!');
            console.log(`   Username: ${profile.username}`);
            console.log(`   VIP Level: ${profile.vip_level}`);
            console.log(`   Full Name: ${profile.full_name}`);
        }

        // Check if user record was created
        console.log('\n4. Checking for user record...');
        const { data: userRecord, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', signupData.user.id)
            .single();

        if (userError || !userRecord) {
            console.error('❌ NO USER RECORD CREATED');
            console.error('   Error:', userError?.message || 'User record not found');
        } else {
            console.log('✅ User record created successfully!');
            console.log(`   Username: ${userRecord.username}`);
            console.log(`   VIP Level: ${userRecord.vip_level}`);
            console.log(`   Referral Code: ${userRecord.referral_code}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }

    console.log('\n🔍 TEST COMPLETE');
}

testSignup();