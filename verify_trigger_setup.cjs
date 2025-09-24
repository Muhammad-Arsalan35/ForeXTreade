const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function verifyTriggerSetup() {
    console.log('🔍 VERIFYING TRIGGER SETUP...\n');

    try {
        // 1. Check if trigger function exists
        console.log('1. Checking trigger function...');
        const { data: functionData, error: functionError } = await supabase
            .from('pg_proc')
            .select('proname, prosrc')
            .eq('proname', 'create_user_profile_from_auth');

        if (functionError) {
            console.error('❌ Error checking function:', functionError.message);
        } else if (functionData && functionData.length > 0) {
            console.log('✅ Trigger function exists');
            console.log('   Function name:', functionData[0].proname);
        } else {
            console.log('❌ Trigger function NOT found');
        }

        // 2. Check if trigger exists
        console.log('\n2. Checking trigger...');
        const { data: triggerData, error: triggerError } = await supabase
            .from('pg_trigger')
            .select('tgname, tgenabled')
            .eq('tgname', 'on_auth_user_created');

        if (triggerError) {
            console.error('❌ Error checking trigger:', triggerError.message);
        } else if (triggerData && triggerData.length > 0) {
            console.log('✅ Trigger exists');
            console.log('   Trigger name:', triggerData[0].tgname);
            console.log('   Enabled:', triggerData[0].tgenabled === 'O' ? 'Yes' : 'No');
        } else {
            console.log('❌ Trigger NOT found');
        }

        // 3. Check table structures
        console.log('\n3. Checking table structures...');
        
        // Check users table
        const { data: usersColumns, error: usersError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'users')
            .eq('table_schema', 'public')
            .order('ordinal_position');

        if (usersError) {
            console.error('❌ Error checking users table:', usersError.message);
        } else {
            console.log('✅ Users table structure:');
            const vipColumn = usersColumns.find(col => col.column_name === 'vip_level');
            if (vipColumn) {
                console.log(`   ✅ vip_level column: ${vipColumn.data_type}`);
            } else {
                console.log('   ❌ vip_level column missing');
            }
        }

        // Check user_profiles table
        const { data: profilesColumns, error: profilesError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'user_profiles')
            .eq('table_schema', 'public')
            .order('ordinal_position');

        if (profilesError) {
            console.error('❌ Error checking user_profiles table:', profilesError.message);
        } else {
            console.log('✅ User_profiles table structure:');
            const vipColumn = profilesColumns.find(col => col.column_name === 'vip_level');
            if (vipColumn) {
                console.log(`   ✅ vip_level column: ${vipColumn.data_type}`);
            } else {
                console.log('   ❌ vip_level column missing');
            }
        }

        // 4. Check for users without profiles
        console.log('\n4. Checking for users without profiles...');
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
            console.error('❌ Error fetching auth users:', authError.message);
        } else {
            console.log(`📊 Total auth users: ${authUsers.users.length}`);
            
            // Check recent users (last 10)
            const recentUsers = authUsers.users
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 10);

            console.log('\n📋 Checking recent users for profiles:');
            for (const user of recentUsers) {
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('id, username, vip_level')
                    .eq('user_id', user.id)
                    .single();

                if (profileError || !profile) {
                    console.log(`❌ ${user.email || user.id}: NO PROFILE`);
                } else {
                    console.log(`✅ ${user.email || user.id}: Profile exists (${profile.vip_level})`);
                }
            }
        }

        console.log('\n🔍 VERIFICATION COMPLETE');
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

verifyTriggerSetup();