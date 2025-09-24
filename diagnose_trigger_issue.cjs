const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseTriggerIssue() {
    console.log('🔍 Diagnosing trigger issue...\n');

    try {
        // 1. Check if trigger function exists and get its definition
        console.log('1. Checking trigger function...');
        const { data: functionData, error: functionError } = await supabase
            .from('information_schema.routines')
            .select('*')
            .eq('routine_name', 'create_user_profile_from_auth')
            .eq('routine_type', 'FUNCTION');

        if (functionError) {
            console.log('❌ Error checking function:', functionError.message);
        } else if (functionData && functionData.length > 0) {
            console.log('✅ Function exists');
        } else {
            console.log('❌ Function not found');
        }

        // 2. Check if trigger exists
        console.log('\n2. Checking trigger...');
        const { data: triggerData, error: triggerError } = await supabase
            .from('information_schema.triggers')
            .select('*')
            .eq('trigger_name', 'on_auth_user_created');

        if (triggerError) {
            console.log('❌ Error checking trigger:', triggerError.message);
        } else if (triggerData && triggerData.length > 0) {
            console.log('✅ Trigger exists');
            console.log('   Event:', triggerData[0].event_manipulation);
            console.log('   Table:', triggerData[0].event_object_table);
        } else {
            console.log('❌ Trigger not found');
        }

        // 3. Test the function manually with a recent auth user
        console.log('\n3. Testing function manually...');
        
        // Get the most recent auth user
        const { data: authUsers, error: authError } = await supabase
            .from('auth.users')
            .select('id, email, created_at')
            .order('created_at', { ascending: false })
            .limit(1);

        if (authError) {
            console.log('❌ Error getting auth users:', authError.message);
            return;
        }

        if (!authUsers || authUsers.length === 0) {
            console.log('❌ No auth users found');
            return;
        }

        const latestAuthUser = authUsers[0];
        console.log(`   Latest auth user: ${latestAuthUser.email} (${latestAuthUser.id})`);

        // Check if this user has a corresponding user record
        const { data: userRecord, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', latestAuthUser.id);

        if (userError) {
            console.log('❌ Error checking user record:', userError.message);
        } else if (userRecord && userRecord.length > 0) {
            console.log('✅ User record exists for this auth user');
        } else {
            console.log('❌ No user record found for this auth user');
            
            // Try to manually call the trigger function
            console.log('\n4. Attempting to manually create user record...');
            
            try {
                // Generate username
                const username = `user_${Date.now()}`;
                
                // Insert into users table
                const { data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert({
                        auth_user_id: latestAuthUser.id,
                        full_name: '',
                        username: username,
                        phone_number: '',
                        profile_avatar: '',
                        vip_level: 1,
                        position_title: 'Member',
                        user_status: 'active',
                        income_wallet_balance: 0.00,
                        personal_wallet_balance: 0.00,
                        total_earnings: 0.00,
                        total_invested: 0.00,
                        referral_code: latestAuthUser.id.substring(0, 8).toUpperCase(),
                        referred_by: null,
                        referral_level: 1,
                        two_factor_enabled: false,
                        two_factor_secret: null,
                        last_login: new Date().toISOString(),
                        login_attempts: 0,
                        account_locked_until: null
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.log('❌ Error inserting user:', insertError.message);
                    console.log('   Details:', insertError);
                } else {
                    console.log('✅ User record created manually');
                    
                    // Now try to create user profile
                    const { data: newProfile, error: profileError } = await supabase
                        .from('user_profiles')
                        .insert({
                            user_id: newUser.id,
                            full_name: '',
                            username: username,
                            phone_number: '',
                            membership_type: 'intern',
                            membership_level: 1,
                            intern_trial_start_date: new Date().toISOString(),
                            intern_trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            intern_trial_expired: false,
                            days_remaining: 7,
                            videos_watched_today: 0,
                            last_video_reset_date: new Date().toISOString(),
                            total_earnings: 0.00,
                            income_wallet_balance: 0.00,
                            personal_wallet_balance: 0.00,
                            daily_earning_limit: 100.00,
                            daily_earnings_today: 0.00,
                            last_earning_reset_date: new Date().toISOString()
                        });

                    if (profileError) {
                        console.log('❌ Error creating profile:', profileError.message);
                    } else {
                        console.log('✅ User profile created manually');
                    }
                }
            } catch (manualError) {
                console.log('❌ Manual creation failed:', manualError.message);
            }
        }

        // 5. Check RLS policies
        console.log('\n5. Checking RLS policies...');
        
        // Test if we can access tables with service key
        const { data: usersTest, error: usersTestError } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        if (usersTestError) {
            console.log('❌ Cannot access users table:', usersTestError.message);
        } else {
            console.log('✅ Can access users table');
        }

        const { data: profilesTest, error: profilesTestError } = await supabase
            .from('user_profiles')
            .select('count')
            .limit(1);

        if (profilesTestError) {
            console.log('❌ Cannot access user_profiles table:', profilesTestError.message);
        } else {
            console.log('✅ Can access user_profiles table');
        }

    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
    }
}

diagnoseTriggerIssue();