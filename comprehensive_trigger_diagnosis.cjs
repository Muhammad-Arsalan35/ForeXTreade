require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function comprehensiveDiagnosis() {
    console.log('🔍 COMPREHENSIVE TRIGGER DIAGNOSIS 🔍\n');

    try {
        // 1. Check if trigger function exists
        console.log('1. Checking trigger function...');
        const { data: functions, error: funcError } = await supabase
            .from('pg_proc')
            .select('proname')
            .eq('proname', 'handle_new_user');
        
        if (funcError) {
            console.log('   ⚠️ Cannot check functions directly, trying alternative method');
        } else {
            console.log(`   ✅ Function check result: ${functions?.length || 0} functions found`);
        }

        // 2. Check if trigger exists
        console.log('\n2. Checking trigger existence...');
        const { data: triggers, error: trigError } = await supabase.rpc('sql', {
            query: `
                SELECT trigger_name, event_manipulation, action_timing, action_statement
                FROM information_schema.triggers 
                WHERE trigger_name = 'on_auth_user_created';
            `
        });
        
        if (trigError) {
            console.log('   ⚠️ Cannot check triggers:', trigError.message);
        } else {
            console.log(`   ✅ Trigger check result: ${triggers?.length || 0} triggers found`);
            if (triggers?.length > 0) {
                console.log('   📋 Trigger details:', triggers[0]);
            }
        }

        // 3. Check user_profiles table structure
        console.log('\n3. Checking user_profiles table structure...');
        const { data: columns, error: colError } = await supabase.rpc('sql', {
            query: `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'user_profiles' 
                AND table_schema = 'public'
                ORDER BY ordinal_position;
            `
        });
        
        if (colError) {
            console.log('   ⚠️ Cannot check columns:', colError.message);
        } else {
            console.log(`   ✅ Found ${columns?.length || 0} columns in user_profiles table`);
            if (columns) {
                columns.forEach(col => {
                    console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
                });
            }
        }

        // 4. Test manual trigger execution
        console.log('\n4. Testing manual trigger execution...');
        const testAuthUser = {
            id: '12345678-1234-1234-1234-123456789012',
            email: 'test@example.com',
            raw_user_meta_data: { full_name: 'Test User' }
        };

        const { data: triggerResult, error: triggerError } = await supabase.rpc('sql', {
            query: `
                SELECT public.handle_new_user() as result;
            `
        });

        if (triggerError) {
            console.log('   ❌ Manual trigger test failed:', triggerError.message);
        } else {
            console.log('   ✅ Manual trigger test result:', triggerResult);
        }

        // 5. Check RLS policies
        console.log('\n5. Checking RLS policies...');
        const { data: policies, error: polError } = await supabase.rpc('sql', {
            query: `
                SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
                FROM pg_policies 
                WHERE tablename IN ('users', 'user_profiles')
                ORDER BY tablename, policyname;
            `
        });

        if (polError) {
            console.log('   ⚠️ Cannot check policies:', polError.message);
        } else {
            console.log(`   ✅ Found ${policies?.length || 0} RLS policies`);
            if (policies) {
                policies.forEach(policy => {
                    console.log(`   - ${policy.tablename}.${policy.policyname}: ${policy.cmd} (${policy.permissive})`);
                });
            }
        }

        // 6. Check current counts
        console.log('\n6. Checking current data counts...');
        const { data: userCount } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true });
        
        const { data: profileCount } = await supabase
            .from('user_profiles')
            .select('id', { count: 'exact', head: true });

        console.log(`   📊 Users: ${userCount?.length || 'unknown'}`);
        console.log(`   📊 User Profiles: ${profileCount?.length || 'unknown'}`);

        // 7. Test direct user creation
        console.log('\n7. Testing direct user creation...');
        const testUser = {
            auth_user_id: '87654321-4321-4321-4321-210987654321',
            full_name: 'Direct Test User',
            username: 'directtest_' + Date.now(),
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
            console.log('   ❌ Direct user creation failed:', userError.message);
        } else {
            console.log('   ✅ Direct user creation successful:', newUser.id);
            
            // Test direct profile creation
            const testProfile = {
                user_id: newUser.id,
                full_name: 'Direct Test User',
                username: 'directtest_' + Date.now(),
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
                console.log('   ❌ Direct profile creation failed:', profileError.message);
            } else {
                console.log('   ✅ Direct profile creation successful:', newProfile.id);
                
                // Cleanup test data
                await supabase.from('user_profiles').delete().eq('id', newProfile.id);
                await supabase.from('users').delete().eq('id', newUser.id);
                console.log('   🧹 Test data cleaned up');
            }
        }

        // 8. Test auth signup
        console.log('\n8. Testing auth signup...');
        const testEmail = `diagnosis_${Date.now()}@forextrade.com`;
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: testEmail,
            password: 'TestPass123!'
        });

        if (authError) {
            console.log('   ❌ Auth signup failed:', authError.message);
        } else {
            console.log('   ✅ Auth signup successful, user ID:', authData.user?.id);
            
            // Check if profile was created by trigger
            setTimeout(async () => {
                const { data: createdUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('auth_user_id', authData.user.id)
                    .single();
                
                const { data: createdProfile } = await supabase
                    .from('user_profiles')
                    .select('id')
                    .eq('user_id', createdUser?.id)
                    .single();

                if (createdUser && createdProfile) {
                    console.log('   ✅ Trigger worked! User and profile created');
                } else {
                    console.log('   ❌ Trigger failed! Missing user or profile');
                }
            }, 2000);
        }

    } catch (error) {
        console.error('❌ Diagnosis failed:', error.message);
    }
}

comprehensiveDiagnosis();