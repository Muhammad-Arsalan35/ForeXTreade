require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedSignup() {
    console.log('🧪 Testing fixed signup process...\n');
    
    try {
        // 1. Create a test user
        const testEmail = `test_fixed_${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';
        
        console.log(`📝 Creating test user: ${testEmail}`);
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    full_name: 'Test Fixed User',
                    username: 'testfixed'
                }
            }
        });
        
        if (authError) {
            console.error('❌ Auth signup error:', authError);
            return;
        }
        
        console.log('✅ Auth user created successfully!');
        console.log(`   ID: ${authData.user.id}`);
        
        // Wait for trigger to execute
        console.log('\n⏳ Waiting for trigger to execute...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 2. Check if user was created in users table with retries
        console.log('\n🔍 Checking if user was created in users table...');
        let newUser = null;
        let attempts = 0;
        const maxAttempts = 5;

        while (!newUser && attempts < maxAttempts) {
            attempts++;
            console.log(`   Attempt ${attempts}/${maxAttempts}...`);
            
            const { data: userData, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('auth_user_id', authData.user.id)
                .maybeSingle();

            if (fetchError) {
                console.log(`   ❌ Error on attempt ${attempts}:`, fetchError.message);
            } else if (userData) {
                newUser = userData;
                console.log('✅ User created successfully in users table!');
                console.log(`   User ID: ${newUser.id}`);
                console.log(`   Username: ${newUser.username}`);
                console.log(`   VIP Level: ${newUser.vip_level}`);
                break;
            } else {
                console.log(`   ⏳ User not found yet, waiting...`);
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        if (!newUser) {
            console.log('❌ User was not created in users table after all attempts!');
            console.log('❓ Trigger may not be working correctly!');
        }

        // 3. Check user profile
        let newProfile = null;
        if (newUser) {
            console.log('\n🔍 Checking if user profile was created...');
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', newUser.id)
                .maybeSingle();

            if (profileError) {
                console.log('❌ Error fetching user profile:', profileError.message);
            } else if (profile) {
                newProfile = profile;
                console.log('✅ User profile created successfully!');
                console.log(`   Profile ID: ${newProfile.id}`);
                console.log(`   Username: ${newProfile.username}`);
                console.log(`   Membership Type: ${newProfile.membership_type}`);
            } else {
                console.log('❌ User profile was not created!');
            }
        }
        
        // 4. Clean up test user
        console.log('\n🧹 Cleaning up test user...');
        
        if (newUser?.id) {
            const { error: profileDeleteError } = await supabase
                .from('user_profiles')
                .delete()
                .eq('user_id', newUser.id);
                
            if (profileDeleteError) {
                console.error('❌ Error deleting user profile:', profileDeleteError);
            } else {
                console.log('✅ User profile deleted successfully!');
            }
            
            const { error: userDeleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', newUser.id);
                
            if (userDeleteError) {
                console.error('❌ Error deleting user:', userDeleteError);
            } else {
                console.log('✅ User deleted successfully!');
            }
        }
        
        // Delete auth user
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(authData.user.id);
        if (authDeleteError) {
            console.log('⚠️ Could not delete auth user (admin access required)');
        } else {
            console.log('✅ Auth user deleted successfully!');
        }
        
        // 5. Summary
        console.log('\n📋 Test Summary:');
        if (newUser && newUser.vip_level === 'intern' && newProfile && newProfile.membership_type === 'intern') {
            console.log('✅ SIGNUP PROCESS FIXED SUCCESSFULLY!');
            console.log('✅ User created with correct "intern" VIP level');
            console.log('✅ User profile created with correct "intern" membership type');
        } else if (newUser && newProfile) {
            console.log('⚠️ SIGNUP PROCESS WORKING BUT WITH ISSUES:');
            console.log(`   - VIP Level: ${newUser.vip_level} (should be "intern")`);
            console.log(`   - Membership Type: ${newProfile.membership_type} (should be "intern")`);
        } else if (newUser && !newProfile) {
            console.log('⚠️ PARTIAL SUCCESS:');
            console.log('   - Auth user created successfully');
            console.log('   - User record created in users table');
            console.log('   - ❌ User profile NOT created');
        } else {
            console.log('❌ SIGNUP PROCESS HAS ISSUES:');
            console.log('   - Auth user created successfully');
            console.log('   - ❌ User record NOT created in users table');
            console.log('   - Check trigger function and database constraints');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the test
testFixedSignup();