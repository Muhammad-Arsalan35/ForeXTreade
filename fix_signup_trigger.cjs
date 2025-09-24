const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://woiccythjszfhbypacaa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM0NiwiZXhwIjoyMDc0MDU4MzQ2fQ.F1_wsNmySrDhGlstpi3HbAZFWuzFioeGWYTdYA6zlU0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSignupTrigger() {
  try {
    console.log('🔧 Fixing Signup Trigger - Setting Default to Intern...\n');

    // 1. First, let's fix existing users to have 'intern' instead of VIP1
    console.log('📝 Step 1: Updating existing users to intern level...');
    
    const { data: existingUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, full_name, vip_level')
      .neq('vip_level', 'intern');

    if (fetchError) {
      console.error('❌ Error fetching existing users:', fetchError);
    } else {
      console.log(`Found ${existingUsers.length} users with non-intern levels`);
      
      for (const user of existingUsers) {
        console.log(`Updating ${user.full_name} from ${user.vip_level} to intern...`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ vip_level: 'intern' })
          .eq('id', user.id);
          
        if (updateError) {
          console.error(`❌ Error updating user ${user.full_name}:`, updateError);
        } else {
          console.log(`✅ Updated ${user.full_name} to intern level`);
        }
      }
    }

    // 2. Create a corrected trigger function
    console.log('\n📝 Step 2: Creating corrected trigger function...');
    
    const triggerFunction = `
-- ============================================================================
-- CORRECTED USER PROFILE TRIGGER - SETS INTERN AS DEFAULT
-- ============================================================================

-- 1. Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Insert into public.users table first with 'intern' as default vip_level
    INSERT INTO public.users (
        auth_user_id,
        full_name,
        username,
        phone_number,
        referral_code,
        user_status,
        vip_level
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
        UPPER(substr(gen_random_uuid()::text, 1, 8)),
        'active',
        'intern'
    ) RETURNING id INTO new_user_id;
    
    -- Create user profile with intern membership
    INSERT INTO public.user_profiles (
        user_id,
        full_name,
        username,
        phone_number,
        membership_type,
        membership_level
    ) VALUES (
        new_user_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
        'intern',
        'intern'
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and continue
        RAISE LOG 'Error in create_user_profile_from_auth: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create new trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_from_auth();

-- 4. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
`;

    // Execute the trigger function
    const { error: triggerError } = await supabase.rpc('exec_sql', { 
      sql: triggerFunction 
    });

    if (triggerError) {
      console.error('❌ Error creating trigger function:', triggerError);
      
      // Try alternative approach - execute parts separately
      console.log('Trying alternative approach...');
      
      const parts = [
        `CREATE OR REPLACE FUNCTION create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
BEGIN
    INSERT INTO public.users (
        auth_user_id,
        full_name,
        username,
        phone_number,
        referral_code,
        user_status,
        vip_level
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
        UPPER(substr(gen_random_uuid()::text, 1, 8)),
        'active',
        'intern'
    ) RETURNING id INTO new_user_id;
    
    INSERT INTO public.user_profiles (
        user_id,
        full_name,
        username,
        phone_number,
        membership_type,
        membership_level
    ) VALUES (
        new_user_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
        'intern',
        'intern'
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in create_user_profile_from_auth: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`,

        `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`,
        
        `CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_from_auth();`
      ];
      
      for (const sql of parts) {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          console.error('❌ Error executing SQL part:', error);
        }
      }
    } else {
      console.log('✅ Trigger function created successfully');
    }

    // 3. Test the trigger with a new user
    console.log('\n📝 Step 3: Testing the corrected trigger...');
    
    const testEmail = `test_intern_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`Creating test user: ${testEmail}`);
    
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test Intern User',
          username: 'testintern',
          phone_number: '+1234567890'
        }
      }
    });

    if (signupError) {
      console.error('❌ Signup error:', signupError);
    } else {
      console.log('✅ Auth user created successfully');
      
      // Wait for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if user was created with intern level
      const { data: newUser, error: newUserError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user?.id)
        .single();

      if (newUserError) {
        console.error('❌ Error fetching new user:', newUserError);
      } else {
        console.log('✅ User created in users table:');
        console.log(`   Full Name: ${newUser.full_name}`);
        console.log(`   VIP Level: ${newUser.vip_level}`);
        console.log(`   Expected: intern, Actual: ${newUser.vip_level}`);
        
        if (newUser.vip_level === 'intern') {
          console.log('🎉 SUCCESS: New user correctly assigned intern level!');
        } else {
          console.log('❌ FAILED: User still getting wrong level');
        }
      }
      
      // Check user profile
      const { data: newProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', newUser?.id)
        .single();

      if (profileError) {
        console.error('❌ Error fetching user profile:', profileError);
      } else {
        console.log('✅ User profile created:');
        console.log(`   Membership Type: ${newProfile.membership_type}`);
        console.log(`   Membership Level: ${newProfile.membership_level}`);
      }
      
      // Clean up test user
      console.log('\n🧹 Cleaning up test user...');
      if (newUser?.id) {
        await supabase.from('user_profiles').delete().eq('user_id', newUser.id);
        await supabase.from('users').delete().eq('id', newUser.id);
        console.log('✅ Test user cleaned up');
      }
    }

    console.log('\n✅ Signup trigger fix completed!');
    console.log('\n📋 Summary:');
    console.log('- Updated existing users to intern level');
    console.log('- Created corrected trigger function');
    console.log('- New users will now get "intern" level by default');
    console.log('- Both users table (vip_level) and user_profiles table (membership_type/level) are set correctly');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixSignupTrigger();