const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTriggerNow() {
    const testEmail = `trigger_test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log('🧪 TESTING TRIGGER RIGHT NOW...');
    console.log(`📧 Test email: ${testEmail}\n`);

    try {
        // Test signup
        console.log('1. Attempting signup...');
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    full_name: 'Trigger Test User'
                }
            }
        });

        if (signupError) {
            console.error('❌ SIGNUP FAILED:', signupError.message);
            console.error('   Error details:', signupError);
            return;
        }

        console.log('✅ Signup successful!');
        console.log(`   User ID: ${signupData.user?.id}`);
        console.log(`   Email: ${signupData.user?.email}`);

        // Wait for trigger to execute
        console.log('\n2. Waiting 3 seconds for trigger...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if user record was created
        console.log('3. Checking for user record...');
        const { data: userRecord, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', signupData.user.id)
            .single();

        if (userError || !userRecord) {
            console.error('❌ NO USER RECORD CREATED');
            console.error('   Error:', userError?.message || 'User record not found');
        } else {
            console.log('✅ User record created!');
            console.log(`   ID: ${userRecord.id}`);
            console.log(`   Username: ${userRecord.username}`);
            console.log(`   VIP Level: ${userRecord.vip_level}`);
        }

        // Check if profile was created
        console.log('\n4. Checking for user profile...');
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userRecord?.id)
            .single();

        if (profileError || !profile) {
            console.error('❌ NO PROFILE CREATED');
            console.error('   Error:', profileError?.message || 'Profile not found');
        } else {
            console.log('✅ Profile created!');
            console.log(`   ID: ${profile.id}`);
            console.log(`   Username: ${profile.username}`);
            console.log(`   VIP Level: ${profile.vip_level}`);
            console.log(`   Membership Type: ${profile.membership_type}`);
        }

        // Summary
        console.log('\n📊 SUMMARY:');
        console.log(`   Auth User: ✅`);
        console.log(`   User Record: ${userRecord ? '✅' : '❌'}`);
        console.log(`   User Profile: ${profile ? '✅' : '❌'}`);
        
        if (userRecord && profile) {
            console.log('\n🎉 TRIGGER IS WORKING! Signup issue is FIXED!');
        } else {
            console.log('\n❌ TRIGGER IS NOT WORKING - Issue persists');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testTriggerNow();