require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignupVipIssue() {
    console.log('🔍 Testing signup VIP level issue...\n');
    
    try {
        // 1. Check current users and their VIP levels
        console.log('📊 Current users and VIP levels:');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, full_name, username, vip_level, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (usersError) {
            console.error('❌ Error fetching users:', usersError);
        } else {
            console.table(users);
        }
        
        // 2. Check user profiles and membership types
        console.log('\n📊 Current user profiles and membership types:');
        const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, user_id, membership_type, membership_level, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (profilesError) {
            console.error('❌ Error fetching user profiles:', profilesError);
        } else {
            console.table(profiles);
        }
        
        // 3. Check if trigger exists
        console.log('\n🔧 Checking if trigger exists:');
        const { data: triggers, error: triggerError } = await supabase
            .rpc('exec_sql', { 
                sql: `SELECT trigger_name, event_manipulation, action_statement 
                      FROM information_schema.triggers 
                      WHERE trigger_name = 'on_auth_user_created';` 
            });
            
        if (triggerError) {
            console.log('⚠️ Cannot check triggers via RPC (expected)');
        } else {
            console.table(triggers);
        }
        
        // 4. Test creating a new user
        const testEmail = `test_vip_${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';
        
        console.log(`\n🧪 Testing signup with email: ${testEmail}`);
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    full_name: 'Test User VIP',
                    username: 'testvip'
                }
            }
        });
        
        if (authError) {
            console.error('❌ Auth signup error:', authError);
            return;
        }
        
        console.log('✅ Auth user created:', authData.user?.id);
        
        // Wait a moment for trigger to execute
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 5. Check if user was created in users table
        const { data: newUser, error: newUserError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', authData.user.id)
            .single();
            
        if (newUserError) {
            console.error('❌ Error fetching new user:', newUserError);
        } else {
            console.log('✅ New user created in users table:');
            console.log(`   - ID: ${newUser.id}`);
            console.log(`   - VIP Level: ${newUser.vip_level}`);
            console.log(`   - Full Name: ${newUser.full_name}`);
            console.log(`   - Username: ${newUser.username}`);
        }
        
        // 6. Check if user profile was created
        const { data: newProfile, error: newProfileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', newUser?.id)
            .single();
            
        if (newProfileError) {
            console.error('❌ Error fetching new user profile:', newProfileError);
        } else {
            console.log('✅ New user profile created:');
            console.log(`   - Membership Type: ${newProfile.membership_type}`);
            console.log(`   - Membership Level: ${newProfile.membership_level}`);
        }
        
        // 7. Clean up test user
        console.log('\n🧹 Cleaning up test user...');
        if (newUser?.id) {
            await supabase.from('user_profiles').delete().eq('user_id', newUser.id);
            await supabase.from('users').delete().eq('id', newUser.id);
        }
        
        // Delete auth user
        const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user.id);
        if (deleteError) {
            console.log('⚠️ Could not delete auth user (admin access required)');
        }
        
        console.log('✅ Test completed!');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the test
testSignupVipIssue();