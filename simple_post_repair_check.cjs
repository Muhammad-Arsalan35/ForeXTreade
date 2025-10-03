require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function postRepairCheck() {
    console.log('🔍 POST-REPAIR DATABASE CHECK 🔍\n');

    try {
        // 1. Check if tables exist and get counts
        console.log('1. Checking table existence and counts...');
        
        try {
            const { count: userCount } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });
            console.log(`   ✅ Users table exists, count: ${userCount}`);
        } catch (error) {
            console.log(`   ❌ Users table issue: ${error.message}`);
        }

        try {
            const { count: profileCount } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true });
            console.log(`   ✅ User_profiles table exists, count: ${profileCount}`);
        } catch (error) {
            console.log(`   ❌ User_profiles table issue: ${error.message}`);
        }

        // 2. Test direct table operations
        console.log('\n2. Testing direct table operations...');
        
        // Test inserting a user directly
        const testUser = {
            auth_user_id: '11111111-1111-1111-1111-111111111111',
            full_name: 'Test User Direct',
            username: 'testdirect_' + Date.now(),
            phone_number: '+1234567890',
            vip_level: 'VIP1',
            user_status: 'active',
            referral_code: 'TEST1234',
            personal_wallet_balance: 0,
            income_wallet_balance: 0,
            total_earnings: 0,
            total_invested: 0,
            position_title: 'Member'
        };

        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert(testUser)
            .select()
            .single();

        if (userError) {
            console.log(`   ❌ Direct user insert failed: ${userError.message}`);
            console.log(`   🔍 Error details: ${JSON.stringify(userError, null, 2)}`);
        } else {
            console.log(`   ✅ Direct user insert successful: ${newUser.id}`);
            
            // Test inserting a profile
            const testProfile = {
                user_id: newUser.id,
                full_name: 'Test User Direct',
                username: 'testdirect_' + Date.now(),
                phone_number: '+1234567890',
                membership_type: 'intern',
                membership_level: 'Intern',
                is_trial_active: true,
                trial_start_date: new Date().toISOString().split('T')[0],
                trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                videos_watched_today: 0,
                last_video_reset_date: new Date().toISOString().split('T')[0],
                total_earnings: 0,
                income_wallet_balance: 0,
                personal_wallet_balance: 0
            };

            const { data: newProfile, error: profileError } = await supabase
                .from('user_profiles')
                .insert(testProfile)
                .select()
                .single();

            if (profileError) {
                console.log(`   ❌ Direct profile insert failed: ${profileError.message}`);
                console.log(`   🔍 Error details: ${JSON.stringify(profileError, null, 2)}`);
            } else {
                console.log(`   ✅ Direct profile insert successful: ${newProfile.id}`);
                
                // Cleanup
                await supabase.from('user_profiles').delete().eq('id', newProfile.id);
                await supabase.from('users').delete().eq('id', newUser.id);
                console.log('   🧹 Test data cleaned up');
            }
        }

        // 3. Test auth signup to see exact error
        console.log('\n3. Testing auth signup for detailed error...');
        const testEmail = `postrepair_${Date.now()}@forextrade.com`;
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: testEmail,
            password: 'TestPass123!'
        });

        if (authError) {
            console.log(`   ❌ Auth signup failed: ${authError.message}`);
            console.log(`   🔍 Full error: ${JSON.stringify(authError, null, 2)}`);
        } else {
            console.log(`   ✅ Auth signup successful: ${authData.user?.id}`);
            
            // Wait a moment and check if trigger created user/profile
            setTimeout(async () => {
                try {
                    const { data: createdUser } = await supabase
                        .from('users')
                        .select('id')
                        .eq('auth_user_id', authData.user.id)
                        .single();
                    
                    if (createdUser) {
                        console.log('   ✅ Trigger created user successfully');
                        
                        const { data: createdProfile } = await supabase
                            .from('user_profiles')
                            .select('id')
                            .eq('user_id', createdUser.id)
                            .single();
                        
                        if (createdProfile) {
                            console.log('   ✅ Trigger created profile successfully');
                            console.log('\n🎉 TRIGGER IS WORKING! 🎉');
                        } else {
                            console.log('   ❌ Trigger did not create profile');
                        }
                    } else {
                        console.log('   ❌ Trigger did not create user');
                    }
                } catch (checkError) {
                    console.log(`   ❌ Error checking trigger results: ${checkError.message}`);
                }
            }, 3000);
        }

        // 4. Check if we can access the sql function now
        console.log('\n4. Testing sql RPC function...');
        try {
            const { data: sqlTest, error: sqlError } = await supabase.rpc('sql', {
                query: 'SELECT 1 as test'
            });
            
            if (sqlError) {
                console.log(`   ❌ SQL RPC function not working: ${sqlError.message}`);
            } else {
                console.log('   ✅ SQL RPC function is working');
                console.log(`   📋 Test result: ${JSON.stringify(sqlTest)}`);
            }
        } catch (error) {
            console.log(`   ❌ SQL RPC function error: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Post-repair check failed:', error.message);
    }
}

postRepairCheck();