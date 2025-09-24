const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function debugTriggerExecution() {
    console.log('🔍 DEBUGGING TRIGGER EXECUTION...\n');

    try {
        // 1. Check current table structures
        console.log('1. Checking table structures...');
        
        // Check users table columns
        const { data: usersColumns, error: usersError } = await supabase
            .rpc('sql', { 
                query: `
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = 'users' AND table_schema = 'public'
                    ORDER BY ordinal_position;
                `
            });

        if (usersError) {
            console.error('❌ Error checking users table:', usersError.message);
        } else {
            console.log('✅ Users table columns:');
            usersColumns.forEach(col => {
                console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
        }

        // Check user_profiles table columns
        const { data: profilesColumns, error: profilesError } = await supabase
            .rpc('sql', { 
                query: `
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = 'user_profiles' AND table_schema = 'public'
                    ORDER BY ordinal_position;
                `
            });

        if (profilesError) {
            console.error('❌ Error checking user_profiles table:', profilesError.message);
        } else {
            console.log('\n✅ User_profiles table columns:');
            profilesColumns.forEach(col => {
                console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
        }

        // 2. Check RLS policies
        console.log('\n2. Checking RLS policies...');
        const { data: policies, error: policiesError } = await supabase
            .rpc('sql', { 
                query: `
                    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
                    FROM pg_policies 
                    WHERE schemaname = 'public' AND tablename IN ('users', 'user_profiles')
                    ORDER BY tablename, policyname;
                `
            });

        if (policiesError) {
            console.error('❌ Error checking policies:', policiesError.message);
        } else {
            console.log('✅ RLS Policies:');
            policies.forEach(policy => {
                console.log(`   ${policy.tablename}.${policy.policyname}: ${policy.cmd} (${policy.permissive})`);
            });
        }

        // 3. Test trigger function manually
        console.log('\n3. Testing trigger function manually...');
        const { data: testResult, error: testError } = await supabase
            .rpc('sql', { 
                query: `
                    -- Create a test auth user record structure
                    DO $$
                    DECLARE
                        test_user_id UUID := gen_random_uuid();
                        test_email TEXT := 'manual_test_${Date.now()}@example.com';
                    BEGIN
                        -- Try to execute the trigger function logic manually
                        RAISE NOTICE 'Testing trigger function with user ID: %', test_user_id;
                        RAISE NOTICE 'Testing trigger function with email: %', test_email;
                        
                        -- This will help us see if there are any errors in the function
                        PERFORM public.create_user_profile_from_auth();
                        
                    EXCEPTION
                        WHEN OTHERS THEN
                            RAISE NOTICE 'Error in manual trigger test: %', SQLERRM;
                    END $$;
                `
            });

        if (testError) {
            console.error('❌ Error testing trigger manually:', testError.message);
        } else {
            console.log('✅ Manual trigger test completed');
        }

        // 4. Check recent auth users and their profiles
        console.log('\n4. Checking recent auth users...');
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
            console.error('❌ Error fetching auth users:', authError.message);
        } else {
            const recentUsers = authUsers.users
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5);

            console.log('📋 Recent 5 users and their profiles:');
            for (const user of recentUsers) {
                // Check for user record
                const { data: userRecord, error: userError } = await supabase
                    .from('users')
                    .select('id, username, vip_level')
                    .eq('auth_user_id', user.id)
                    .single();

                // Check for profile
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('id, username, vip_level')
                    .eq('user_id', userRecord?.id)
                    .single();

                console.log(`   ${user.email || user.id}:`);
                console.log(`     User record: ${userRecord ? '✅' : '❌'}`);
                console.log(`     Profile: ${profile ? '✅' : '❌'}`);
                if (userRecord) console.log(`     Username: ${userRecord.username}, VIP: ${userRecord.vip_level}`);
            }
        }

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }

    console.log('\n🔍 DEBUG COMPLETE');
}

debugTriggerExecution();